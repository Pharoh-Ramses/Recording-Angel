import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createClient } from "@libsql/client";
import { migrateWard } from "../src/db/migrations";
import { createServer, type ServerConfig } from "../src/server";
import { createMockTranslator } from "./helpers/mock-openai";
import {
  startMockDeepgram,
  type MockDeepgramServer,
} from "./helpers/mock-deepgram";

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
});
