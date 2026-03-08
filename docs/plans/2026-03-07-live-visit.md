# Live Visit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate the recording-angel API into the web app so ward admins can host real-time translated meeting sessions and anyone with a join code can read translated text.

**Architecture:** Direct WebSocket from browser. Next.js Server Action creates sessions (keeps API key server-side), then the browser connects directly to the recording-angel API via WebSocket. No proxy layer. Host pages are ward-scoped with permission gating. Listener pages are public at `/live/join`.

**Tech Stack:** Next.js App Router, Convex (permissions + data), recording-angel API (WebSocket + HTTP), Web Audio API (getUserMedia + AudioWorklet), TypeScript, shadcn/ui, Tailwind.

---

### Task 1: Add transcript and session listing endpoints to recording-angel API

**Files:**

- Modify: `apps/recording-angel/src/server.ts`
- Test: `apps/recording-angel/test/server.test.ts`

**Step 1: Write failing tests for GET /sessions/:id/transcript and GET /sessions?wardId=...&status=ended**

Add to `apps/recording-angel/test/server.test.ts`:

```typescript
describe("GET /sessions/:id/transcript", () => {
  it("returns transcript segments for a completed session", async () => {
    // Create a session
    const createRes = await fetch(`${baseUrl}/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-api-key",
      },
      body: JSON.stringify({
        wardId: "ward-123",
        stakeId: "stake-456",
        languages: ["es"],
      }),
    });
    const { sessionId, hostToken } = await createRes.json();

    // Connect host, send audio, then end session via WebSocket
    const ws = new WebSocket(`${baseUrl.replace("http", "ws")}/ws`);
    await new Promise<void>((resolve) => {
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "host:connect", token: hostToken }));
      };
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === "host:connected") resolve();
      };
    });
    // Send some audio to trigger transcription pipeline
    ws.send(new ArrayBuffer(320));
    // Wait for Deepgram mock to process
    await new Promise((r) => setTimeout(r, 200));
    // End session
    ws.send(JSON.stringify({ type: "host:disconnect" }));
    await new Promise((r) => setTimeout(r, 200));
    ws.close();

    // Fetch transcript
    const res = await fetch(`${baseUrl}/sessions/${sessionId}/transcript`, {
      headers: { Authorization: "Bearer test-api-key" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.segments).toBeInstanceOf(Array);
    expect(body.segments.length).toBeGreaterThan(0);
    expect(body.segments[0]).toHaveProperty("source_text");
    expect(body.segments[0]).toHaveProperty("language");
    expect(body.segments[0]).toHaveProperty("text");
  });

  it("returns 401 without API key", async () => {
    const res = await fetch(`${baseUrl}/sessions/fake-id/transcript`);
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown session", async () => {
    const res = await fetch(`${baseUrl}/sessions/nonexistent/transcript`, {
      headers: { Authorization: "Bearer test-api-key" },
    });
    expect(res.status).toBe(404);
  });
});

describe("GET /sessions?wardId=...&status=ended", () => {
  it("lists ended sessions for a ward", async () => {
    // Create and end a session
    const createRes = await fetch(`${baseUrl}/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-api-key",
      },
      body: JSON.stringify({
        wardId: "ward-list-test",
        stakeId: "stake-456",
        languages: ["es"],
      }),
    });
    const { hostToken } = await createRes.json();

    // Connect and immediately end
    const ws = new WebSocket(`${baseUrl.replace("http", "ws")}/ws`);
    await new Promise<void>((resolve) => {
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "host:connect", token: hostToken }));
      };
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === "host:connected") resolve();
      };
    });
    ws.send(JSON.stringify({ type: "host:disconnect" }));
    await new Promise((r) => setTimeout(r, 200));
    ws.close();

    const res = await fetch(
      `${baseUrl}/sessions?wardId=ward-list-test&status=ended`,
      { headers: { Authorization: "Bearer test-api-key" } },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessions).toBeInstanceOf(Array);
    expect(body.sessions.length).toBeGreaterThanOrEqual(1);
  });

  it("returns 401 without API key", async () => {
    const res = await fetch(`${baseUrl}/sessions?wardId=w&status=ended`);
    expect(res.status).toBe(401);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd apps/recording-angel && bun test test/server.test.ts`
Expected: FAIL — new tests fail with 404 / assertion errors.

**Step 3: Implement the endpoints**

In `apps/recording-angel/src/server.ts`, add two handler functions and wire them into the `fetch` handler.

Add `wardId` tracking to session creation so we can query by ward:

```typescript
// In the SessionEntry interface, add:
wardId: string;

// In handlePost, add wardId to the entry:
const entry: SessionEntry = {
  session,
  sessionId,
  joinCode,
  hostToken,
  languages,
  wardId,
};
```

Add handler for transcript retrieval:

```typescript
async function handleGetTranscript(
  sessionId: string,
  req: Request,
): Promise<Response> {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!validateApiKey(token, config.apiKey)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entry = sessions.get(sessionId);
  if (!entry) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const db = await config.getDatabase("ward", entry.wardId, null);
  const result = await db.execute({
    sql: "SELECT id, session_id, sequence, source_text, language, text, is_final, created_at FROM transcript_segments WHERE session_id = ? ORDER BY sequence",
    args: [sessionId],
  });

  return Response.json({
    segments: result.rows.map((row) => ({
      id: row.id,
      session_id: row.session_id,
      sequence: row.sequence,
      source_text: row.source_text,
      language: row.language,
      text: row.text,
      is_final: row.is_final,
      created_at: row.created_at,
    })),
  });
}
```

Add handler for session listing:

```typescript
async function handleListSessions(
  wardId: string,
  status: string,
  req: Request,
): Promise<Response> {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!validateApiKey(token, config.apiKey)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await config.getDatabase("ward", wardId, null);
  const result = await db.execute({
    sql: "SELECT id, join_code, source_lang, target_langs, status, started_at, ended_at, created_at, listener_count FROM sessions WHERE status = ? ORDER BY created_at DESC",
    args: [status],
  });

  return Response.json({
    sessions: result.rows.map((row) => ({
      id: row.id,
      joinCode: row.join_code,
      sourceLang: row.source_lang,
      targetLangs: JSON.parse(row.target_langs as string),
      status: row.status,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      createdAt: row.created_at,
      listenerCount: row.listener_count,
    })),
  });
}
```

Wire into the `fetch` handler inside `createServer`:

```typescript
// GET /sessions/:id/transcript
const transcriptMatch = url.pathname.match(
  /^\/sessions\/([a-f0-9-]+)\/transcript$/,
);
if (req.method === "GET" && transcriptMatch) {
  return handleGetTranscript(transcriptMatch[1]!, req);
}

// GET /sessions?wardId=...&status=...
if (req.method === "GET" && url.pathname === "/sessions") {
  const wardId = url.searchParams.get("wardId");
  const status = url.searchParams.get("status");
  if (wardId && status) {
    return handleListSessions(wardId, status, req);
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd apps/recording-angel && bun test test/server.test.ts`
Expected: All tests PASS.

**Step 5: Run full test suite**

Run: `cd apps/recording-angel && bun test`
Expected: All tests PASS.

**Step 6: Commit**

```bash
git add apps/recording-angel/src/server.ts apps/recording-angel/test/server.test.ts
git commit -m "feat(recording-angel): add transcript retrieval and session listing endpoints"
```

---

### Task 2: Add `live:manage` permission to the web app

**Files:**

- Modify: `apps/web/convex/lib/permissions.ts`
- Modify: `apps/web/convex/seed.ts` (if system roles reference permissions)

**Step 1: Add the permission**

In `apps/web/convex/lib/permissions.ts`, add `"live:manage"` to `ALL_PERMISSIONS`:

```typescript
export const ALL_PERMISSIONS = [
  "post:create",
  "post:publish_directly",
  "post:approve",
  "post:promote_to_stake",
  "member:approve",
  "member:view",
  "role:manage",
  "moderation:configure",
  "comment:create",
  "comment:moderate",
  "live:manage",
] as const;
```

**Step 2: Update seed data to include `live:manage` in the bishop/admin role**

Check `apps/web/convex/seed.ts` and add `"live:manage"` to the system admin/bishop role permissions array.

**Step 3: Commit**

```bash
git add apps/web/convex/lib/permissions.ts apps/web/convex/seed.ts
git commit -m "feat: add live:manage permission for live visit sessions"
```

---

### Task 3: Create Server Action for session creation

**Files:**

- Create: `apps/web/app/actions/live-session.ts`

**Step 1: Write the Server Action**

```typescript
"use server";

import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface CreateSessionResult {
  sessionId: string;
  joinCode: string;
  hostToken: string;
}

export async function createLiveSession(
  wardId: Id<"wards">,
  stakeId: Id<"stakes">,
): Promise<CreateSessionResult> {
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  if (!token) throw new Error("Not authenticated");

  convex.setAuth(token);

  // Verify user has live:manage permission
  const permissions = await convex.query(api.roles.myPermissions, { wardId });
  if (!permissions.includes("live:manage")) {
    throw new Error("You don't have permission to manage live sessions");
  }

  // Get stake languages
  const stake = await convex.query(api.stakes.get, { id: stakeId });
  if (!stake) throw new Error("Stake not found");

  const languages = stake.languages.filter((lang: string) => lang !== "en");
  if (languages.length === 0) {
    throw new Error("No target languages configured for this stake");
  }

  // Call recording-angel API
  const apiUrl = process.env.RECORDING_ANGEL_URL;
  const apiKey = process.env.RECORDING_ANGEL_API_KEY;
  if (!apiUrl || !apiKey) {
    throw new Error("Recording Angel API not configured");
  }

  const res = await fetch(`${apiUrl}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      wardId: wardId,
      stakeId: stakeId,
      languages,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to create live session");
  }

  return (await res.json()) as CreateSessionResult;
}
```

Note: This requires a `stakes.get` query. Check if one exists; if not, add it.

**Step 2: Add `stakes.get` query if missing**

In `apps/web/convex/stakes.ts`, add:

```typescript
export const get = query({
  args: { id: v.id("stakes") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});
```

**Step 3: Commit**

```bash
git add apps/web/app/actions/live-session.ts apps/web/convex/stakes.ts
git commit -m "feat: add server action for creating live sessions"
```

---

### Task 4: Create `useRecordingAngelSocket` hook

**Files:**

- Create: `apps/web/hooks/use-recording-angel-socket.ts`

**Step 1: Write the hook**

```typescript
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SocketStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface TranscriptMessage {
  type: "transcript";
  text: string;
  language: string;
  isFinal: boolean;
}

export interface SessionEndedMessage {
  type: "session:ended";
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

type ServerMessage = TranscriptMessage | SessionEndedMessage | ErrorMessage;

interface UseRecordingAngelSocketOptions {
  url: string;
  onTranscript?: (msg: TranscriptMessage) => void;
  onSessionEnded?: () => void;
  onError?: (msg: ErrorMessage) => void;
}

export function useRecordingAngelSocket(
  options: UseRecordingAngelSocketOptions,
) {
  const [status, setStatus] = useState<SocketStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const maxRetries = 3;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    const ws = new WebSocket(options.url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      retriesRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        switch (msg.type) {
          case "transcript":
            optionsRef.current.onTranscript?.(msg);
            break;
          case "session:ended":
            optionsRef.current.onSessionEnded?.();
            break;
          case "error":
            optionsRef.current.onError?.(msg);
            break;
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (retriesRef.current < maxRetries) {
        retriesRef.current++;
        const delay = Math.min(1000 * 2 ** retriesRef.current, 8000);
        setStatus("connecting");
        setTimeout(() => connect(), delay);
      } else {
        setStatus("error");
      }
    };

    ws.onerror = () => {
      // onclose will fire after this
    };
  }, [options.url]);

  const disconnect = useCallback(() => {
    retriesRef.current = maxRetries; // Prevent reconnection
    wsRef.current?.close();
    wsRef.current = null;
    setStatus("disconnected");
  }, []);

  const send = useCallback((data: string | ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  useEffect(() => {
    return () => {
      retriesRef.current = maxRetries;
      wsRef.current?.close();
    };
  }, []);

  return { status, connect, disconnect, send };
}
```

**Step 2: Commit**

```bash
git add apps/web/hooks/use-recording-angel-socket.ts
git commit -m "feat: add useRecordingAngelSocket hook for WebSocket management"
```

---

### Task 5: Create `useAudioCapture` hook

**Files:**

- Create: `apps/web/hooks/use-audio-capture.ts`

**Step 1: Write the hook**

```typescript
"use client";

import { useCallback, useRef, useState } from "react";

export type MicStatus = "inactive" | "requesting" | "active" | "error";

interface UseAudioCaptureOptions {
  onAudioChunk: (chunk: ArrayBuffer) => void;
}

export function useAudioCapture({ onAudioChunk }: UseAudioCaptureOptions) {
  const [micStatus, setMicStatus] = useState<MicStatus>("inactive");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const onAudioChunkRef = useRef(onAudioChunk);
  onAudioChunkRef.current = onAudioChunk;

  const start = useCallback(async () => {
    setMicStatus("requesting");
    setErrorMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      contextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);

      // Use ScriptProcessorNode for broad compatibility
      // (AudioWorklet is better but requires a separate file to serve)
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        const float32 = event.inputBuffer.getChannelData(0);
        // Convert float32 to int16 PCM for Deepgram
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]!));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        onAudioChunkRef.current(int16.buffer);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setMicStatus("active");
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access was denied. Please allow microphone access in your browser settings."
          : "Failed to access microphone. Please check your device settings.";
      setErrorMessage(message);
      setMicStatus("error");
    }
  }, []);

  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    contextRef.current?.close();
    contextRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setMicStatus("inactive");
  }, []);

  return { micStatus, errorMessage, start, stop };
}
```

**Step 2: Commit**

```bash
git add apps/web/hooks/use-audio-capture.ts
git commit -m "feat: add useAudioCapture hook for browser microphone streaming"
```

---

### Task 6: Create listener join page (`/live/join`)

**Files:**

- Create: `apps/web/app/live/join/page.tsx`
- Create: `apps/web/app/live/layout.tsx`

**Step 1: Create the live layout (minimal, no app shell)**

```typescript
// apps/web/app/live/layout.tsx
export default function LiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold">Our Stake</h1>
        <p className="text-xs text-muted-foreground">Live Visit</p>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
```

**Step 2: Create the join page**

```typescript
// apps/web/app/live/join/page.tsx
"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function JoinFormInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCode = searchParams.get("code") ?? "";
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = code.trim().toUpperCase();
      if (trimmed.length !== 6) {
        setError("Join code must be 6 characters");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_RECORDING_ANGEL_URL;
        const res = await fetch(`${apiUrl}/sessions/${trimmed}`);
        if (res.status === 404) {
          setError("Session not found. Check the code and try again.");
          return;
        }
        if (!res.ok) {
          setError("Something went wrong. Try again.");
          return;
        }

        const { sessionId } = await res.json();
        router.push(`/live/${sessionId}?code=${trimmed}`);
      } catch {
        setError("Could not connect. Check your internet and try again.");
      } finally {
        setLoading(false);
      }
    },
    [code, router],
  );

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h2 className="text-2xl font-bold">Join a Live Session</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enter the 6-character join code shared by the host
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase().slice(0, 6));
              setError(null);
            }}
            placeholder="ABC123"
            className="text-center text-2xl tracking-[0.3em] font-mono h-14"
            maxLength={6}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="w-full"
            disabled={loading || code.trim().length !== 6}
          >
            {loading ? "Joining..." : "Join"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinFormInner />
    </Suspense>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/app/live/layout.tsx apps/web/app/live/join/page.tsx
git commit -m "feat: add listener join page at /live/join"
```

---

### Task 7: Create listener transcript view page (`/live/[sessionId]`)

**Files:**

- Create: `apps/web/app/live/[sessionId]/page.tsx`

**Step 1: Write the transcript view page**

```typescript
// apps/web/app/live/[sessionId]/page.tsx
"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  useRecordingAngelSocket,
  type TranscriptMessage,
} from "@/hooks/use-recording-angel-socket";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

interface Segment {
  id: number;
  text: string;
  language: string;
  isFinal: boolean;
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
  zh: "中文",
  ko: "한국어",
  ja: "日本語",
  tl: "Tagalog",
  to: "Lea fakatonga",
  sm: "Gagana Samoa",
};

function TranscriptViewInner() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const code = searchParams.get("code") ?? "";
  const [languages, setLanguages] = useState<string[]>([]);
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const segmentCounter = useRef(0);

  // Fetch available languages
  useEffect(() => {
    async function fetchSession() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_RECORDING_ANGEL_URL;
        const res = await fetch(`${apiUrl}/sessions/${code}`);
        if (res.ok) {
          const data = await res.json();
          setLanguages(data.languages ?? []);
        }
      } catch {
        // Ignore -- user may have navigated directly
      }
    }
    if (code) fetchSession();
  }, [code]);

  const handleTranscript = useCallback((msg: TranscriptMessage) => {
    setSegments((prev) => {
      // If not final, replace the last interim segment
      if (!msg.isFinal) {
        const lastIdx = prev.length - 1;
        if (lastIdx >= 0 && !prev[lastIdx]!.isFinal) {
          const updated = [...prev];
          updated[lastIdx] = { ...updated[lastIdx]!, text: msg.text };
          return updated;
        }
        segmentCounter.current++;
        return [
          ...prev,
          {
            id: segmentCounter.current,
            text: msg.text,
            language: msg.language,
            isFinal: false,
          },
        ];
      }

      // Final segment replaces the last interim
      const lastIdx = prev.length - 1;
      if (lastIdx >= 0 && !prev[lastIdx]!.isFinal) {
        const updated = [...prev];
        updated[lastIdx] = {
          ...updated[lastIdx]!,
          text: msg.text,
          language: msg.language,
          isFinal: true,
        };
        return updated;
      }

      segmentCounter.current++;
      return [
        ...prev,
        {
          id: segmentCounter.current,
          text: msg.text,
          language: msg.language,
          isFinal: true,
        },
      ];
    });
  }, []);

  const apiUrl = process.env.NEXT_PUBLIC_RECORDING_ANGEL_URL ?? "";
  const wsUrl = apiUrl.replace(/^http/, "ws") + "/ws";

  const { status, connect, send } = useRecordingAngelSocket({
    url: wsUrl,
    onTranscript: handleTranscript,
    onSessionEnded: () => setSessionEnded(true),
    onError: (msg) => console.error("Socket error:", msg.message),
  });

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [segments]);

  const handleJoinWithLanguage = useCallback(
    (lang: string) => {
      setSelectedLang(lang);
      setShowLangPicker(false);
      connect();
      // Wait for connection, then send listener:connect
      const interval = setInterval(() => {
        // The hook sets status synchronously enough that
        // we can use the send method which checks readyState
        send(JSON.stringify({ type: "listener:connect", code, language: lang }));
        clearInterval(interval);
      }, 500);
    },
    [connect, send, code],
  );

  const handleSwitchLanguage = useCallback(
    (lang: string) => {
      setSelectedLang(lang);
      send(JSON.stringify({ type: "listener:language", language: lang }));
    },
    [send],
  );

  if (showLangPicker && languages.length > 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div>
            <h2 className="text-2xl font-bold">Select Your Language</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Choose the language you want to read
            </p>
          </div>
          <div className="space-y-2">
            {languages.map((lang) => (
              <Button
                key={lang}
                variant="outline"
                className="w-full h-12 text-lg"
                onClick={() => handleJoinWithLanguage(lang)}
              >
                <Globe className="h-5 w-5 mr-2" />
                {LANGUAGE_LABELS[lang] ?? lang.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Status bar */}
      <div className="px-4 py-2 border-b border-border flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              sessionEnded
                ? "bg-muted-foreground"
                : status === "connected"
                  ? "bg-green-500"
                  : "bg-yellow-500"
            }`}
          />
          <span className="text-muted-foreground">
            {sessionEnded
              ? "Session ended"
              : status === "connected"
                ? "Live"
                : "Connecting..."}
          </span>
        </div>
        {selectedLang && languages.length > 1 && !sessionEnded && (
          <select
            value={selectedLang}
            onChange={(e) => handleSwitchLanguage(e.target.value)}
            className="bg-transparent border border-border rounded px-2 py-1 text-sm"
          >
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {LANGUAGE_LABELS[lang] ?? lang}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Transcript */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-3">
          {segments.length === 0 && !sessionEnded && (
            <p className="text-center text-muted-foreground text-lg">
              Waiting for speaker...
            </p>
          )}
          {segments.map((seg) => (
            <p
              key={seg.id}
              className={`text-lg leading-relaxed ${
                seg.isFinal
                  ? "text-foreground"
                  : "text-muted-foreground italic"
              }`}
            >
              {seg.text}
            </p>
          ))}
          {sessionEnded && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                This session has ended. The transcript has been saved.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LiveSessionPage() {
  return (
    <Suspense>
      <TranscriptViewInner />
    </Suspense>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/app/live/\[sessionId\]/page.tsx
git commit -m "feat: add live transcript viewer page for listeners"
```

---

### Task 8: Create host live dashboard (`/stake/.../ward/.../live`)

**Files:**

- Create: `apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/live/page.tsx`

**Step 1: Write the host dashboard page**

```typescript
// apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/live/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { createLiveSession } from "@/app/actions/live-session";
import { useRecordingAngelSocket } from "@/hooks/use-recording-angel-socket";
import { useAudioCapture } from "@/hooks/use-audio-capture";
import { Button } from "@/components/ui/button";
import { Copy, Mic, MicOff, Radio, Square, Check } from "lucide-react";
import { toast } from "sonner";

type SessionState =
  | { phase: "idle" }
  | {
      phase: "created";
      sessionId: string;
      joinCode: string;
      hostToken: string;
    }
  | { phase: "live"; sessionId: string; joinCode: string; hostToken: string }
  | { phase: "ended" };

export default function LiveDashboardPage() {
  const params = useParams<{ stakeSlug: string; wardSlug: string }>();
  const stake = useQuery(api.stakes.getBySlug, { slug: params.stakeSlug });
  const ward = useQuery(
    api.wards.getBySlug,
    stake ? { slug: params.wardSlug, stakeId: stake._id } : "skip",
  );
  const permissions = useQuery(api.roles.myPermissions, {
    wardId: ward?._id,
  });

  const [sessionState, setSessionState] = useState<SessionState>({
    phase: "idle",
  });
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canManage = permissions?.includes("live:manage") ?? false;

  // Timer for live sessions
  useEffect(() => {
    if (sessionState.phase === "live") {
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionState.phase]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // WebSocket
  const apiUrl = process.env.NEXT_PUBLIC_RECORDING_ANGEL_URL ?? "";
  const wsUrl = apiUrl.replace(/^http/, "ws") + "/ws";

  const { status: socketStatus, connect, disconnect, send } =
    useRecordingAngelSocket({
      url: wsUrl,
      onSessionEnded: () => setSessionState({ phase: "ended" }),
      onError: (msg) => toast.error(msg.message),
    });

  // Audio capture
  const { micStatus, errorMessage: micError, start: startMic, stop: stopMic } =
    useAudioCapture({
      onAudioChunk: (chunk) => send(chunk),
    });

  const handleCreateSession = useCallback(async () => {
    if (!ward || !stake) return;
    setCreating(true);
    try {
      const result = await createLiveSession(ward._id, stake._id);
      setSessionState({
        phase: "created",
        ...result,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create session",
      );
    } finally {
      setCreating(false);
    }
  }, [ward, stake]);

  const handleGoLive = useCallback(async () => {
    if (sessionState.phase !== "created") return;
    connect();
    // Wait for connection, then authenticate as host
    const interval = setInterval(() => {
      send(
        JSON.stringify({
          type: "host:connect",
          token: sessionState.hostToken,
        }),
      );
      clearInterval(interval);
    }, 500);
    await startMic();
    setSessionState({ ...sessionState, phase: "live" });
  }, [sessionState, connect, send, startMic]);

  const handleEndSession = useCallback(() => {
    send(JSON.stringify({ type: "host:disconnect" }));
    stopMic();
    disconnect();
    setSessionState({ phase: "ended" });
  }, [send, stopMic, disconnect]);

  const handleCopyCode = useCallback(async () => {
    if (sessionState.phase !== "created" && sessionState.phase !== "live")
      return;
    const joinUrl = `${window.location.origin}/live/join?code=${sessionState.joinCode}`;
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    toast.success("Join link copied!");
    setTimeout(() => setCopied(false), 2000);
  }, [sessionState]);

  if (!canManage) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          You don&apos;t have permission to manage live sessions.
        </p>
      </div>
    );
  }

  // Idle state
  if (sessionState.phase === "idle") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Radio className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Live Visit</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Start a live session to broadcast real-time translated text to
          listeners.
        </p>
        <Button onClick={handleCreateSession} disabled={creating}>
          {creating ? "Creating..." : "Start Session"}
        </Button>
      </div>
    );
  }

  // Created state — show join code, wait for Go Live
  if (sessionState.phase === "created") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Join Code</p>
          <p className="text-5xl font-mono font-bold tracking-[0.3em]">
            {sessionState.joinCode}
          </p>
        </div>
        <Button variant="outline" onClick={handleCopyCode} className="gap-2">
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Copied!" : "Copy Join Link"}
        </Button>
        <Button size="lg" onClick={handleGoLive} className="gap-2">
          <Mic className="h-5 w-5" />
          Go Live
        </Button>
      </div>
    );
  }

  // Live state
  if (sessionState.phase === "live") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-6">
        <div className="flex items-center gap-2 text-green-600">
          <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
          <span className="font-semibold">LIVE</span>
          <span className="text-muted-foreground ml-2">
            {formatTime(elapsed)}
          </span>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Join Code</p>
          <p className="text-4xl font-mono font-bold tracking-[0.3em]">
            {sessionState.joinCode}
          </p>
        </div>

        <Button variant="outline" onClick={handleCopyCode} className="gap-2">
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Copied!" : "Copy Join Link"}
        </Button>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {micStatus === "active" ? (
            <Mic className="h-4 w-4 text-green-600" />
          ) : (
            <MicOff className="h-4 w-4 text-destructive" />
          )}
          <span>
            {micStatus === "active"
              ? "Microphone active"
              : micError ?? "Microphone inactive"}
          </span>
        </div>

        <Button
          variant="destructive"
          onClick={handleEndSession}
          className="gap-2"
        >
          <Square className="h-4 w-4" />
          End Session
        </Button>
      </div>
    );
  }

  // Ended state
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-lg font-semibold">Session Ended</p>
      <p className="text-sm text-muted-foreground">
        The transcript has been saved.
      </p>
      <Button
        onClick={() => setSessionState({ phase: "idle" })}
        variant="outline"
      >
        Start New Session
      </Button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/app/stake/\[stakeSlug\]/ward/\[wardSlug\]/live/page.tsx
git commit -m "feat: add host live dashboard for ward admins"
```

---

### Task 9: Create archive list page

**Files:**

- Create: `apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/live/archive/page.tsx`
- Create: `apps/web/app/actions/live-archive.ts`

**Step 1: Write the Server Action for fetching archives**

```typescript
// apps/web/app/actions/live-archive.ts
"use server";

interface ArchivedSession {
  id: string;
  sourceLang: string;
  targetLangs: string[];
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  listenerCount: number;
}

interface TranscriptSegment {
  id: string;
  sequence: number;
  sourceText: string;
  language: string;
  text: string;
  isFinal: boolean;
  createdAt: string;
}

export async function listArchivedSessions(
  wardId: string,
): Promise<ArchivedSession[]> {
  const apiUrl = process.env.RECORDING_ANGEL_URL;
  const apiKey = process.env.RECORDING_ANGEL_API_KEY;
  if (!apiUrl || !apiKey) return [];

  const res = await fetch(
    `${apiUrl}/sessions?wardId=${encodeURIComponent(wardId)}&status=ended`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 60 },
    },
  );
  if (!res.ok) return [];

  const data = await res.json();
  return data.sessions;
}

export async function getSessionTranscript(
  sessionId: string,
): Promise<TranscriptSegment[]> {
  const apiUrl = process.env.RECORDING_ANGEL_URL;
  const apiKey = process.env.RECORDING_ANGEL_API_KEY;
  if (!apiUrl || !apiKey) return [];

  const res = await fetch(`${apiUrl}/sessions/${sessionId}/transcript`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return [];

  const data = await res.json();
  return data.segments;
}
```

**Step 2: Write the archive list page**

```typescript
// apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/live/archive/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { listArchivedSessions } from "@/app/actions/live-archive";
import Link from "next/link";
import { CalendarDays, Users, Clock } from "lucide-react";

interface ArchivedSession {
  id: string;
  sourceLang: string;
  targetLangs: string[];
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  listenerCount: number;
}

export default function ArchiveListPage() {
  const params = useParams<{ stakeSlug: string; wardSlug: string }>();
  const stake = useQuery(api.stakes.getBySlug, { slug: params.stakeSlug });
  const ward = useQuery(
    api.wards.getBySlug,
    stake ? { slug: params.wardSlug, stakeId: stake._id } : "skip",
  );
  const [sessions, setSessions] = useState<ArchivedSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ward) return;
    listArchivedSessions(ward._id)
      .then(setSessions)
      .finally(() => setLoading(false));
  }, [ward]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return "--";
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.round(ms / 60000);
    return `${mins} min`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No archived sessions yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h2 className="text-xl font-semibold mb-4">Past Sessions</h2>
      <div className="space-y-2">
        {sessions.map((session) => (
          <Link
            key={session.id}
            href={`/stake/${params.stakeSlug}/ward/${params.wardSlug}/live/archive/${session.id}`}
            className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {formatDate(session.createdAt)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session.targetLangs.join(", ")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(session.startedAt, session.endedAt)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {session.listenerCount}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/app/actions/live-archive.ts apps/web/app/stake/\[stakeSlug\]/ward/\[wardSlug\]/live/archive/page.tsx
git commit -m "feat: add archived sessions list page and server actions"
```

---

### Task 10: Create archive transcript viewer page

**Files:**

- Create: `apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/live/archive/[sessionId]/page.tsx`

**Step 1: Write the transcript viewer**

```typescript
// apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/live/archive/[sessionId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSessionTranscript } from "@/app/actions/live-archive";
import Link from "next/link";
import { ArrowLeft, Globe } from "lucide-react";

const LANGUAGE_LABELS: Record<string, string> = {
  source: "Original",
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
  zh: "中文",
  ko: "한국어",
  ja: "日本語",
  tl: "Tagalog",
  to: "Lea fakatonga",
  sm: "Gagana Samoa",
};

interface TranscriptSegment {
  id: string;
  sequence: number;
  sourceText: string;
  language: string;
  text: string;
  isFinal: boolean;
  createdAt: string;
}

export default function ArchiveDetailPage() {
  const params = useParams<{
    stakeSlug: string;
    wardSlug: string;
    sessionId: string;
  }>();
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLang, setSelectedLang] = useState("source");

  useEffect(() => {
    getSessionTranscript(params.sessionId)
      .then(setSegments)
      .finally(() => setLoading(false));
  }, [params.sessionId]);

  // Get unique languages from segments
  const languages = Array.from(new Set(segments.map((s) => s.language)));

  // Filter to final segments in selected language
  const filtered = segments.filter(
    (s) => s.language === selectedLang && s.isFinal,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading transcript...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <Link
          href={`/stake/${params.stakeSlug}/ward/${params.wardSlug}/live/archive`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to archives
        </Link>

        {languages.length > 1 && (
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="bg-transparent border border-border rounded px-2 py-1 text-sm"
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang] ?? lang}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground">
          No transcript available for this language.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((seg) => (
            <p key={seg.id} className="text-lg leading-relaxed">
              {seg.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/app/stake/\[stakeSlug\]/ward/\[wardSlug\]/live/archive/\[sessionId\]/page.tsx
git commit -m "feat: add archived transcript viewer page"
```

---

### Task 11: Add Live Visit link to ward navigation

**Files:**

- Modify: `apps/web/components/left-sidebar.tsx`
- Modify: `apps/web/components/bottom-tab-bar.tsx`

**Step 1: Add Live link to left sidebar**

In `apps/web/components/left-sidebar.tsx`, import `Radio` from lucide-react and add a "Live Visit" link in the Admin section (or as its own section visible to users with `live:manage` permission):

Add `Radio` to the existing lucide-react imports.

After the Admin section (around line 176), add:

```typescript
{/* Live Visit link */}
{permissions?.includes("live:manage") && activeWard && (
  <div className="px-2 pt-6">
    <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      Live
    </p>
    <nav className="space-y-0.5">
      <Link
        href={`/stake/${params.stakeSlug}/ward/${params.wardSlug}/live`}
        className="flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
      >
        <Radio className="h-4 w-4" />
        Live Visit
      </Link>
    </nav>
  </div>
)}
```

**Step 2: Commit**

```bash
git add apps/web/components/left-sidebar.tsx
git commit -m "feat: add Live Visit link to ward sidebar navigation"
```

---

### Task 12: Add `NEXT_PUBLIC_RECORDING_ANGEL_URL` to environment config

**Files:**

- Modify: `apps/web/.env.example` (or create if it doesn't exist)
- Modify: `apps/web/.env.local` (not committed — just document)

**Step 1: Add environment variables to .env.example**

Add these lines:

```
# Recording Angel API (Live Visit feature)
RECORDING_ANGEL_URL=http://localhost:3001
RECORDING_ANGEL_API_KEY=your-api-key-here
NEXT_PUBLIC_RECORDING_ANGEL_URL=http://localhost:3001
```

**Step 2: Commit**

```bash
git add apps/web/.env.example
git commit -m "chore: add recording-angel env vars to .env.example"
```

---

### Task 13: Verify full build

**Step 1: Run type check**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: No type errors.

**Step 2: Fix any type errors found**

Address any issues, particularly:

- Ensure `api.stakes.get` exists in Convex generated types (may need `npx convex dev` or `npx convex codegen`)
- Ensure all imports resolve correctly

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix type errors in live visit feature"
```
