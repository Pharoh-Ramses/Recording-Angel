import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createClient } from "@libsql/client";
import { migrateWard } from "../src/db/migrations.js";
import { createServer, type ServerConfig } from "../src/server.js";
import { createMockTranslator } from "./helpers/mock-openai.js";
import {
  startMockDeepgram,
  type MockDeepgramServer,
} from "./helpers/mock-deepgram.js";

function createTestConfig(deepgramUrl: string): ServerConfig {
  const db = createClient({ url: ":memory:" });
  return {
    port: 0,
    apiKey: "test-api-key",
    deepgramApiKey: "test-deepgram-key",
    deepgramUrl,
    translator: createMockTranslator(),
    getDatabase: async () => {
      await migrateWard(db);
      return db;
    },
  };
}

describe("HTTP API", () => {
  let server: ReturnType<typeof createServer>;
  let baseUrl: string;
  let mockDeepgram: MockDeepgramServer;

  beforeEach(() => {
    mockDeepgram = startMockDeepgram();
    server = createServer(createTestConfig(mockDeepgram.url));
    baseUrl = `http://localhost:${server.port}`;
  });

  afterEach(() => {
    server.stop(true);
    mockDeepgram.close();
  });

  describe("POST /sessions", () => {
    it("creates a session with valid API key", async () => {
      const res = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-api-key",
        },
        body: JSON.stringify({
          wardId: "ward-123",
          stakeId: "stake-456",
          languages: ["es", "pt"],
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.sessionId).toBeDefined();
      expect(body.joinCode).toHaveLength(6);
      expect(body.hostToken).toBeDefined();
    });

    it("rejects without API key", async () => {
      const res = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wardId: "w", stakeId: "s", languages: ["es"] }),
      });
      expect(res.status).toBe(401);
    });

    it("rejects with wrong API key", async () => {
      const res = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer wrong-key",
        },
        body: JSON.stringify({ wardId: "w", stakeId: "s", languages: ["es"] }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /sessions/:code", () => {
    it("returns session info for a valid join code", async () => {
      const createRes = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-api-key",
        },
        body: JSON.stringify({
          wardId: "ward-123",
          stakeId: "stake-456",
          languages: ["es", "pt"],
        }),
      });
      const { joinCode } = await createRes.json();

      const res = await fetch(`${baseUrl}/sessions/${joinCode}`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.sessionId).toBeDefined();
      expect(body.languages).toEqual(["es", "pt"]);
    });

    it("returns 404 for invalid join code", async () => {
      const res = await fetch(`${baseUrl}/sessions/XXXXXX`);
      expect(res.status).toBe(404);
    });
  });

  describe("GET /sessions/:id/transcript", () => {
    it("returns transcript segments for a completed session", async () => {
      // 1. Create a session
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

      // 2. Connect host via WebSocket
      const ws = new WebSocket(`${baseUrl.replace("http", "ws")}/ws`);
      await new Promise<void>((resolve) => {
        ws.onopen = () => {
          ws.send(JSON.stringify({ type: "host:connect", token: hostToken }));
        };
        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data as string);
          if (msg.type === "host:connected") resolve();
        };
      });

      // 3. Have mock Deepgram emit a final transcript
      mockDeepgram.emitTranscript("hello world", true);

      // Wait for transcript processing (Deepgram -> translation -> store)
      await new Promise((r) => setTimeout(r, 200));

      // 4. End the session
      ws.send(JSON.stringify({ type: "host:disconnect" }));
      await new Promise((r) => setTimeout(r, 200));

      // 5. Fetch transcript
      const res = await fetch(
        `${baseUrl}/sessions/${sessionId}/transcript?wardId=ward-123&stakeId=stake-456`,
        { headers: { Authorization: "Bearer test-api-key" } },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.segments).toBeInstanceOf(Array);
      expect(body.segments.length).toBeGreaterThan(0);
      // Each segment should have expected fields
      const seg = body.segments[0];
      expect(seg.id).toBeDefined();
      expect(seg.session_id).toBe(sessionId);
      expect(typeof seg.sequence).toBe("number");
      expect(seg.source_text).toBeDefined();
      expect(seg.language).toBeDefined();
      expect(seg.text).toBeDefined();
      expect(seg.created_at).toBeDefined();
    });

    it("returns 401 without API key", async () => {
      const fakeId = crypto.randomUUID();
      const res = await fetch(
        `${baseUrl}/sessions/${fakeId}/transcript?wardId=w&stakeId=s`,
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 for unknown session ID", async () => {
      const fakeId = crypto.randomUUID();
      const res = await fetch(
        `${baseUrl}/sessions/${fakeId}/transcript?wardId=w&stakeId=s`,
        { headers: { Authorization: "Bearer test-api-key" } },
      );
      expect(res.status).toBe(404);
    });

    it("returns 400 without required query params", async () => {
      const fakeId = crypto.randomUUID();
      const res = await fetch(`${baseUrl}/sessions/${fakeId}/transcript`, {
        headers: { Authorization: "Bearer test-api-key" },
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /sessions?wardId=...&status=ended", () => {
    it("lists ended sessions for a ward", async () => {
      // 1. Create a session
      const createRes = await fetch(`${baseUrl}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-api-key",
        },
        body: JSON.stringify({
          wardId: "ward-list-test",
          stakeId: "stake-456",
          languages: ["es", "pt"],
        }),
      });
      const { sessionId, hostToken } = await createRes.json();

      // 2. Connect host and end session to set status = ended
      const ws = new WebSocket(`${baseUrl.replace("http", "ws")}/ws`);
      await new Promise<void>((resolve) => {
        ws.onopen = () => {
          ws.send(JSON.stringify({ type: "host:connect", token: hostToken }));
        };
        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data as string);
          if (msg.type === "host:connected") resolve();
        };
      });

      ws.send(JSON.stringify({ type: "host:disconnect" }));
      await new Promise((r) => setTimeout(r, 200));

      // 3. List sessions
      const res = await fetch(
        `${baseUrl}/sessions?wardId=ward-list-test&stakeId=stake-456&status=ended`,
        { headers: { Authorization: "Bearer test-api-key" } },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.sessions).toBeInstanceOf(Array);
      expect(body.sessions.length).toBeGreaterThanOrEqual(1);
      const s = body.sessions.find((s: any) => s.id === sessionId);
      expect(s).toBeDefined();
      expect(s.joinCode).toBeDefined();
      expect(s.sourceLang).toBe("en");
      expect(s.targetLangs).toEqual(["es", "pt"]);
      expect(s.status).toBe("ended");
    });

    it("returns 401 without API key", async () => {
      const res = await fetch(
        `${baseUrl}/sessions?wardId=ward-123&stakeId=stake-456&status=ended`,
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 without required query params", async () => {
      const res = await fetch(`${baseUrl}/sessions?wardId=ward-123`, {
        headers: { Authorization: "Bearer test-api-key" },
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid status value", async () => {
      const res = await fetch(
        `${baseUrl}/sessions?wardId=ward-123&stakeId=stake-456&status=bogus`,
        { headers: { Authorization: "Bearer test-api-key" } },
      );
      expect(res.status).toBe(400);
    });
  });
});
