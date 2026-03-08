# Live Visit Feature — Design

## Overview

Web app integration of the recording-angel API. A ward admin starts a live session, shares a join code, and members read real-time translated text on their phones. Transcripts are archived and viewable after the session ends.

## Architecture

**Approach: Direct WebSocket from browser.** The Next.js server handles session creation (keeping the API key secret via a Server Action), then the browser connects directly to the recording-angel API via WebSocket. No proxy layer.

## Decisions

- **Who can start sessions:** Ward admins only (permission-gated via existing RBAC)
- **Who can join:** Anyone with a join code (no auth required — lowest friction for visitors)
- **Languages:** Pulled from the stake's configured `languages` array
- **Audio capture:** Browser mic via `getUserMedia` + AudioWorklet (PCM encoding)
- **Archives:** Viewable as a ward page by any ward member

## Routing

### Host pages (ward-scoped, auth required)

| Route                                                         | Purpose                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------- |
| `/stake/[stakeSlug]/ward/[wardSlug]/live`                     | Live Visit dashboard. Start session or manage active session. |
| `/stake/[stakeSlug]/ward/[wardSlug]/live/archive`             | List of past sessions (date, duration, listener count).       |
| `/stake/[stakeSlug]/ward/[wardSlug]/live/archive/[sessionId]` | Transcript viewer for a past session with language selector.  |

### Listener pages (public, no auth)

| Route                    | Purpose                                        |
| ------------------------ | ---------------------------------------------- |
| `/live/join`             | Enter join code manually.                      |
| `/live/join?code=ABC123` | Auto-lookup session, go to language selection. |
| `/live/[sessionId]`      | Live transcript reader with language switcher. |

## Session Lifecycle

### 1. Creation

Ward admin clicks "Start Session." A Next.js Server Action:

1. Authenticates via Clerk
2. Verifies ward admin permission via Convex
3. Fetches stake languages from Convex
4. Calls `POST /sessions` on recording-angel API with API key
5. Returns `{ sessionId, joinCode, hostToken }` to client

### 2. Going Live

Host clicks "Go Live." Browser:

1. Requests mic access via `getUserMedia`
2. Sets up AudioWorklet for PCM capture
3. Opens WebSocket to recording-angel `/ws`
4. Sends `{ type: "host:connect", token: "<hostToken>" }`
5. Streams binary audio frames

### 3. Listening

Listener visits `/live/join?code=ABC123`:

1. Web app calls `GET /sessions/ABC123` to validate and get languages
2. Listener selects language
3. Browser opens WebSocket, sends `{ type: "listener:connect", code: "ABC123", language: "es" }`
4. Receives real-time transcript messages

### 4. Ending

Host clicks "End Session" or closes browser:

1. Sends `{ type: "host:disconnect" }` via WebSocket
2. Recording-angel notifies listeners with `session:ended`
3. Transcript archived to Turso

## Components

### Host-side

- **`LiveDashboard`** — Main view. Checks for active session. Shows "Start Session" or active session controls.
- **`SessionControls`** — Join code (large, copyable), listener count, session timer, mic indicator, "End Session" button.
- **`AudioCapture`** — Headless. Handles getUserMedia, AudioWorklet, PCM encoding. Exposes mic state (active/muted/error).

### Listener-side

- **`JoinForm`** — 6-character code input, "Join" button. Auto-submits if code in URL.
- **`LanguageSelector`** — Pick from session languages. Available during session for mid-session switching.
- **`TranscriptView`** — Auto-scrolling transcript. Interim text in lighter style, replaced by final translated text. Mobile-first, large readable typography.
- **`SessionEndedBanner`** — Shown when session ends. Links to archive.

### Shared

- **`useRecordingAngelSocket`** — Custom hook for WebSocket management. Connect/disconnect, message parsing, reconnection with exponential backoff.

## Server-Side Integration

### Server Action: `createLiveSession`

1. Authenticate via Clerk
2. Query Convex: verify ward admin permission
3. Query Convex: get stake languages
4. Call `POST /sessions` on recording-angel API with env API key
5. Return `{ sessionId, joinCode, hostToken }`

### Environment Variables

- `RECORDING_ANGEL_URL` — Base URL of the recording-angel API
- `RECORDING_ANGEL_API_KEY` — API key for session creation

### New Recording-Angel API Endpoints

- `GET /sessions/:id/transcript` — Archived transcript segments for a completed session. Auth: API key.
- `GET /sessions?wardId=...&status=ended` — List past sessions for a ward. Auth: API key.

## Error Handling

| Scenario                        | Handling                                                   |
| ------------------------------- | ---------------------------------------------------------- |
| Mic permission denied           | Clear message with browser-specific instructions           |
| WebSocket connection fails      | Exponential backoff (3 attempts), then manual retry button |
| Invalid join code               | "Session not found. Check the code and try again."         |
| Session ended while listening   | "Session ended" banner with archive link                   |
| Recording-angel API unreachable | "Live Visit is temporarily unavailable"                    |
| Network drop (host)             | Auto-reconnect WebSocket. Deepgram handles audio gaps      |
| Network drop (listener)         | Auto-reconnect and resume. May miss segments during gap    |

## Testing

### Web App

| What                              | How                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| `useRecordingAngelSocket`         | Unit test with mock WebSocket. Verify connect/disconnect, message parsing, reconnection.   |
| `AudioCapture`                    | Unit test with mocked getUserMedia. Permission granted/denied, audio chunk production.     |
| `createLiveSession` Server Action | Integration test: mock Convex + recording-angel API. Permission check, API call, errors.   |
| `TranscriptView`                  | Component test: feed transcript messages, verify rendering, interim vs final, auto-scroll. |
| `JoinForm`                        | Component test: code input, validation, submission, error states.                          |

### Recording-Angel API (new endpoints)

- Unit tests for transcript retrieval and session listing queries
- Added to existing integration test suite
