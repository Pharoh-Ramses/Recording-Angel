import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { createClient, type Client } from "@libsql/client";
import { migrateWard } from "../src/db/migrations";
import { Session, type SessionConfig, type SessionDeps } from "../src/session";
import {
  startMockDeepgram,
  type MockDeepgramServer,
} from "./helpers/mock-deepgram";
import { createMockTranslator } from "./helpers/mock-openai";

function createTestConfig(overrides?: Partial<SessionConfig>): SessionConfig {
  return {
    id: "session-1",
    joinCode: "ABC123",
    hostToken: "host-token-1",
    sourceLang: "en",
    targetLangs: ["es", "pt"],
    ...overrides,
  };
}

function createTestDeps(db: Client, deepgramUrl: string): SessionDeps {
  return {
    db,
    deepgramApiKey: "test-key",
    deepgramUrl,
    translator: createMockTranslator(),
  };
}

describe("Session", () => {
  let db: Client;
  let mockDeepgram: MockDeepgramServer;

  beforeEach(async () => {
    db = createClient({ url: ":memory:" });
    await migrateWard(db);
    await db.execute({
      sql: "INSERT INTO sessions (id, join_code, host_token, source_lang, target_langs, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [
        "session-1",
        "ABC123",
        "host-token-1",
        "en",
        '["es","pt"]',
        "waiting",
        new Date().toISOString(),
      ],
    });
    mockDeepgram = startMockDeepgram();
  });

  afterEach(() => {
    mockDeepgram.close();
  });

  describe("lifecycle", () => {
    it("starts in waiting status", () => {
      const session = new Session(
        createTestConfig(),
        createTestDeps(db, mockDeepgram.url),
      );
      expect(session.status).toBe("waiting");
    });

    it("moves to live when host connects", async () => {
      const session = new Session(
        createTestConfig(),
        createTestDeps(db, mockDeepgram.url),
      );
      const mockWs = { send: mock(() => {}), close: mock(() => {}) };
      await session.addHost(mockWs as any);
      expect(session.status).toBe("live");
    });

    it("moves to ended when end() is called", async () => {
      const session = new Session(
        createTestConfig(),
        createTestDeps(db, mockDeepgram.url),
      );
      const mockWs = { send: mock(() => {}), close: mock(() => {}) };
      await session.addHost(mockWs as any);
      await session.end();
      expect(session.status).toBe("ended");
    });

    it("rejects a second host", async () => {
      const session = new Session(
        createTestConfig(),
        createTestDeps(db, mockDeepgram.url),
      );
      const ws1 = { send: mock(() => {}), close: mock(() => {}) };
      const ws2 = { send: mock(() => {}), close: mock(() => {}) };
      await session.addHost(ws1 as any);
      expect(() => session.addHost(ws2 as any)).toThrow();
    });
  });

  describe("listeners", () => {
    it("adds a listener", () => {
      const session = new Session(
        createTestConfig(),
        createTestDeps(db, mockDeepgram.url),
      );
      const mockWs = { send: mock(() => {}), close: mock(() => {}) };
      session.addListener("l1", mockWs as any, "es");
      expect(session.listenerCount).toBe(1);
    });

    it("removes a listener", () => {
      const session = new Session(
        createTestConfig(),
        createTestDeps(db, mockDeepgram.url),
      );
      const mockWs = { send: mock(() => {}), close: mock(() => {}) };
      session.addListener("l1", mockWs as any, "es");
      session.removeListener("l1");
      expect(session.listenerCount).toBe(0);
    });

    it("notifies listeners when session ends", async () => {
      const session = new Session(
        createTestConfig(),
        createTestDeps(db, mockDeepgram.url),
      );
      const hostWs = { send: mock(() => {}), close: mock(() => {}) };
      const listenerWs = { send: mock(() => {}), close: mock(() => {}) };
      await session.addHost(hostWs as any);
      session.addListener("l1", listenerWs as any, "es");
      await session.end();
      const sentMessages = listenerWs.send.mock.calls.map((c: any) =>
        JSON.parse(c[0] as string),
      );
      expect(sentMessages.some((m: any) => m.type === "session:ended")).toBe(
        true,
      );
    });
  });

  describe("transcript pipeline", () => {
    it("broadcasts interim results in source language to all listeners", async () => {
      const session = new Session(
        createTestConfig(),
        createTestDeps(db, mockDeepgram.url),
      );
      const hostWs = { send: mock(() => {}), close: mock(() => {}) };
      const esWs = { send: mock(() => {}), close: mock(() => {}) };
      const ptWs = { send: mock(() => {}), close: mock(() => {}) };
      await session.addHost(hostWs as any);
      session.addListener("l1", esWs as any, "es");
      session.addListener("l2", ptWs as any, "pt");

      mockDeepgram.emitTranscript("hel", false);
      await Bun.sleep(100);

      const esMsgs = esWs.send.mock.calls.map((c: any) =>
        JSON.parse(c[0] as string),
      );
      const ptMsgs = ptWs.send.mock.calls.map((c: any) =>
        JSON.parse(c[0] as string),
      );
      expect(
        esMsgs.some((m: any) => m.type === "transcript" && !m.isFinal),
      ).toBe(true);
      expect(
        ptMsgs.some((m: any) => m.type === "transcript" && !m.isFinal),
      ).toBe(true);
    });

    it("translates final results and routes to correct language groups", async () => {
      const session = new Session(
        createTestConfig(),
        createTestDeps(db, mockDeepgram.url),
      );
      const hostWs = { send: mock(() => {}), close: mock(() => {}) };
      const esWs = { send: mock(() => {}), close: mock(() => {}) };
      const ptWs = { send: mock(() => {}), close: mock(() => {}) };
      await session.addHost(hostWs as any);
      session.addListener("l1", esWs as any, "es");
      session.addListener("l2", ptWs as any, "pt");

      mockDeepgram.emitTranscript("hello world", true);
      await Bun.sleep(200);

      const esMsgs = esWs.send.mock.calls.map((c: any) =>
        JSON.parse(c[0] as string),
      );
      const ptMsgs = ptWs.send.mock.calls.map((c: any) =>
        JSON.parse(c[0] as string),
      );
      const esFinal = esMsgs.find(
        (m: any) => m.type === "transcript" && m.isFinal && m.language === "es",
      );
      const ptFinal = ptMsgs.find(
        (m: any) => m.type === "transcript" && m.isFinal && m.language === "pt",
      );
      // Mock translator prefixes with [lang]
      expect(esFinal.text).toBe("[es] hello world");
      expect(esFinal.language).toBe("es");
      expect(ptFinal.text).toBe("[pt] hello world");
      expect(ptFinal.language).toBe("pt");
    });

    it("flushes transcript to database on end", async () => {
      const session = new Session(
        createTestConfig(),
        createTestDeps(db, mockDeepgram.url),
      );
      const hostWs = { send: mock(() => {}), close: mock(() => {}) };
      await session.addHost(hostWs as any);
      session.addListener(
        "l1",
        { send: mock(() => {}), close: mock(() => {}) } as any,
        "es",
      );

      mockDeepgram.emitTranscript("hello", true);
      await Bun.sleep(200);
      await session.end();

      const result = await db.execute({
        sql: "SELECT * FROM transcript_segments WHERE session_id = ?",
        args: ["session-1"],
      });
      expect(result.rows.length).toBeGreaterThan(0);
    });
  });
});
