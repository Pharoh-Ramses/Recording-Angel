# Recording Angel API — Design

## Overview

A real-time speech-to-text translation API for LDS stake and ward meetings. A bishop starts a live session, connects their phone's microphone, and shares a join code. Listeners join with the code, select their language, and read translated text in real time. Transcripts are archived after the session ends.

Built as a Bun WebSocket server following deep module philosophy: simple external interface, complex internal implementation. Developed with TDD red/green/refactor practices.

## Tech Stack

- **Runtime:** Bun
- **Transport:** Bun WebSocket (native)
- **Speech-to-Text:** Deepgram (streaming WebSocket API)
- **Translation:** OpenAI gpt-4o-mini
- **Storage:** Turso (libSQL) — multi-tenant, per-ward and per-stake databases
- **Location:** `apps/recording-angel` in the monorepo

## External Interface

The entire public API is one WebSocket endpoint and two HTTP endpoints.

### HTTP Endpoints

```
POST /sessions
  Auth: API key
  Body: { wardId: string, stakeId: string, languages: string[] }
  Returns: { sessionId, joinCode, hostToken }

GET  /sessions/:code
  Auth: none
  Returns: { sessionId, name, languages: string[] }
```

### WebSocket Endpoint

```
WS /ws
```

One endpoint, two roles determined by the first message:

**Host (bishop):**

```json
{ "type": "host:connect", "token": "<hostToken>" }
```

Then sends binary audio frames. Receives status messages.

**Listener:**

```json
{ "type": "listener:connect", "code": "ABC123", "language": "es" }
```

Receives translated transcript segments. Can send:

```json
{ "type": "listener:language", "language": "pt" }
```

**Server -> Client messages (both roles):**

```json
{ "type": "transcript", "text": "...", "language": "es", "isFinal": false }
{ "type": "session:ended" }
{ "type": "error", "message": "..." }
```

## Session Lifecycle

### States

```
waiting -> live -> ended
```

No pause/resume — YAGNI. Join codes expire when the session ends.

### 1. Creation

Bishop (via web app) calls `POST /sessions` with API key. Server generates a 6-character alphanumeric join code and a single-use host token (UUID). Creates a session record in the appropriate Turso database. Session starts in `waiting` state.

### 2. Live

Bishop connects via WebSocket with the host token. Session moves to `live`. Listeners connect with the join code and their preferred language. The pipeline activates: audio flows from bishop through Deepgram STT, then through OpenAI translation, then fans out to listeners grouped by language.

### 3. Ending

Bishop sends `{ "type": "host:disconnect" }` or closes the WebSocket. Server notifies all listeners with `session:ended`, disconnects all listener WebSockets, and moves session to `ended`.

### 4. Archival

After session ends, the full transcript (source language + all translations) is flushed from the in-memory buffer to Turso. Session record is updated with duration, listener count, and languages served.

## Internal Pipeline

One `Session` class orchestrates the entire pipeline. This is where the deep module philosophy is expressed — the caller interacts with a tiny API while the Session manages all internal complexity.

### Flow

```
Browser Mic -> [audio chunks] -> Bun WebSocket Server
                                       |
                                Session.onAudio(chunk)
                                       |
                               Deepgram WebSocket (STT)
                                       |
                            onTranscript(text, isFinal)
                                       |
                         +------ TranslationQueue ------+
                         |             |                 |
                    translate("es") translate("pt") translate("zh")
                    (OpenAI)        (OpenAI)         (OpenAI)
                         |             |                 |
                    broadcast to   broadcast to     broadcast to
                    es listeners   pt listeners     zh listeners
```

### Internal Components

**`Session`** — The deep module. Owns the full lifecycle. Created with a config object, exposes `addHost()`, `addListener()`, `onAudio()`, `end()`. Everything else is private.

**`DeepgramStream`** — Manages the WebSocket connection to Deepgram. Handles reconnection, interim vs final results, and encoding format (linear16 PCM). Emits transcript events to the Session.

**`TranslationQueue`** — Batches final transcript segments and dispatches translation requests to OpenAI. Only translates to languages with active listeners. Deduplicates — if a language was already translated for a segment, it skips.

**`ListenerRegistry`** — Tracks connected listeners grouped by language. Handles fan-out: when a translated segment arrives, pushes to all listeners of that language. Handles disconnect and language-switch without disrupting the pipeline.

**`TranscriptStore`** — Buffers transcript segments in memory during the session. On session end, flushes the full transcript (source + all translations) to Turso.

### Translation Strategy

- **Interim results** (Deepgram partials): broadcast in source language only, no translation. Gives listeners real-time progress.
- **Final results**: sent through TranslationQueue, translated to all active languages in parallel.
- Listeners see fast-updating source-language partials, then the translated final version replaces them.

## Data Model & Multi-Tenant Storage

### Database Architecture

A control database acts as the global registry. Ward and stake databases hold session data.

```
Control DB (one global)
+-- organizations table: maps wardId/stakeId to Turso DB URL

Ward DB (one per ward)
+-- sessions table
+-- transcript_segments table

Stake DB (one per stake)
+-- sessions table
+-- transcript_segments table
+-- ward_databases table: registry of ward DB URLs within this stake
```

### Schema

**Control DB — `organizations`**

| Column     | Type          | Description                   |
| ---------- | ------------- | ----------------------------- |
| id         | TEXT PK       | UUID                          |
| org_type   | TEXT NOT NULL | 'ward' or 'stake'             |
| org_id     | TEXT NOT NULL | wardId or stakeId from Convex |
| stake_id   | TEXT          | parent stake (null if stake)  |
| db_url     | TEXT NOT NULL | Turso database URL            |
| db_token   | TEXT NOT NULL | Turso auth token              |
| created_at | TEXT NOT NULL | ISO timestamp                 |

**Stake DB — `ward_databases`**

| Column   | Type          | Description        |
| -------- | ------------- | ------------------ |
| ward_id  | TEXT PK       | wardId from Convex |
| db_url   | TEXT NOT NULL | Turso database URL |
| db_token | TEXT NOT NULL | Turso auth token   |

**Ward/Stake DB — `sessions`**

| Column         | Type                 | Description                    |
| -------------- | -------------------- | ------------------------------ |
| id             | TEXT PK              | UUID                           |
| join_code      | TEXT UNIQUE NOT NULL | 6-char alphanumeric            |
| host_token     | TEXT NOT NULL        | UUID, single-use               |
| source_lang    | TEXT NOT NULL        | Language being spoken          |
| target_langs   | TEXT NOT NULL        | JSON array of target languages |
| status         | TEXT NOT NULL        | 'waiting', 'live', or 'ended'  |
| started_at     | TEXT                 | When host connected            |
| ended_at       | TEXT                 | When session ended             |
| created_at     | TEXT NOT NULL        | ISO timestamp                  |
| listener_count | INTEGER DEFAULT 0    | Peak listener count            |

**Ward/Stake DB — `transcript_segments`**

| Column      | Type             | Description                 |
| ----------- | ---------------- | --------------------------- |
| id          | TEXT PK          | UUID                        |
| session_id  | TEXT NOT NULL    | FK to sessions              |
| sequence    | INTEGER NOT NULL | Ordering                    |
| source_text | TEXT NOT NULL    | Original transcription      |
| language    | TEXT NOT NULL    | 'source' or language code   |
| text        | TEXT NOT NULL    | Translated (or source) text |
| is_final    | BOOLEAN NOT NULL | Final vs interim            |
| created_at  | TEXT NOT NULL    | ISO timestamp               |

### Database Provisioning

Lazy provisioning — databases are created on first use:

1. Check control DB for existing database for the ward/stake
2. If none, create a new Turso database via Turso API
3. Run migrations on the new database
4. Register in control DB and in the stake's `ward_databases` table if it's a ward

## Project Structure

```
apps/recording-angel/
  package.json
  tsconfig.json
  src/
    index.ts              -- Bun.serve() entry point, WebSocket + HTTP handlers
    session.ts            -- Session class (the deep module)
    deepgram-stream.ts    -- Deepgram WebSocket client
    translation-queue.ts  -- OpenAI translation batching
    listener-registry.ts  -- Listener tracking & fan-out
    transcript-store.ts   -- In-memory buffer + Turso flush
    db/
      client.ts           -- Turso client factory, multi-tenant routing
      control.ts          -- Control DB operations
      migrations.ts       -- Schema migrations for ward/stake DBs
      provisioner.ts      -- Lazy database creation via Turso API
    auth.ts               -- API key validation, host token generation
    errors.ts             -- Error types
  test/
    session.test.ts
    deepgram-stream.test.ts
    translation-queue.test.ts
    listener-registry.test.ts
    transcript-store.test.ts
    db/
      control.test.ts
      provisioner.test.ts
    integration/
      pipeline.test.ts    -- Full audio-in -> text-out integration test
    helpers/
      mock-deepgram.ts    -- Fake Deepgram WebSocket server
      mock-openai.ts      -- Fake OpenAI translation responses
  .env.example
```

## Testing Strategy

TDD red/green/refactor with `bun:test`.

**Unit tests** — each module tested in isolation:

- `Session`: mocked Deepgram, OpenAI, and Turso. Verify lifecycle transitions, audio forwarding, transcript fan-out, archival on end.
- `DeepgramStream`: mock WebSocket server. Verify interim vs final handling, reconnection.
- `TranslationQueue`: mocked OpenAI. Verify batching, deduplication, active-language-only translation.
- `ListenerRegistry`: pure logic, no mocks. Verify add/remove, language grouping, fan-out, language switching.
- `TranscriptStore`: in-memory SQLite. Verify buffering, flush-on-end, segment ordering.
- `db/control` and `db/provisioner`: in-memory SQLite for control DB, mocked Turso API for provisioning.

**Integration test** — `pipeline.test.ts`: real Bun server, real WebSocket connections, mock Deepgram server, mocked OpenAI, in-memory SQLite. Verifies the full audio-in to text-out flow.

| Component     | Unit Tests       | Integration Tests |
| ------------- | ---------------- | ----------------- |
| Bun WebSocket | Mocked           | Real              |
| Deepgram      | Mocked           | Mock server       |
| OpenAI        | Mocked           | Mocked            |
| Turso/SQLite  | In-memory SQLite | In-memory SQLite  |
| Session logic | Real             | Real              |

## Authentication

- **Service-level:** API key in `Authorization` header for `POST /sessions`. Keys are environment variables for now.
- **Host:** single-use host token returned at session creation. Validated on WebSocket connect.
- **Listeners:** join code only, no authentication. Lowest friction for visitors.

## Future Considerations (not built now)

- Pause/resume sessions
- Multiple audio sources per session (e.g., multiple speakers)
- Mobile app client
- Session recording (audio archival, not just text)
- Rate limiting and abuse prevention
- Horizontal scaling with shared session state (Redis)
