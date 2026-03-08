import { describe, it, expect, beforeEach } from "bun:test";
import { createClient, type Client } from "@libsql/client";
import { migrateWard } from "../src/db/migrations";
import { TranscriptStore, type Segment } from "../src/transcript-store";

describe("TranscriptStore", () => {
  let db: Client;
  let store: TranscriptStore;
  const sessionId = "test-session-id";

  beforeEach(async () => {
    db = createClient({ url: ":memory:" });
    await migrateWard(db);
    await db.execute({
      sql: `INSERT INTO sessions (id, join_code, host_token, source_lang, target_langs, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        sessionId,
        "ABCD",
        "host-token",
        "en",
        "es",
        "active",
        new Date().toISOString(),
      ],
    });
    store = new TranscriptStore(sessionId, db);
  });

  describe("append", () => {
    it("adds a segment to the buffer", () => {
      store.append({
        sourceText: "hello",
        language: "source",
        text: "hello",
        isFinal: true,
      });
      expect(store.segmentCount).toBe(1);
    });

    it("assigns sequential sequence numbers", () => {
      store.append({
        sourceText: "hello",
        language: "source",
        text: "hello",
        isFinal: true,
      });
      store.append({
        sourceText: "world",
        language: "source",
        text: "world",
        isFinal: true,
      });
      const segments = store.getBuffer();
      expect(segments[0]!.sequence).toBe(0);
      expect(segments[1]!.sequence).toBe(1);
    });
  });

  describe("flush", () => {
    it("writes all buffered segments to the database", async () => {
      store.append({
        sourceText: "hello",
        language: "source",
        text: "hello",
        isFinal: true,
      });
      store.append({
        sourceText: "hello",
        language: "es",
        text: "hola",
        isFinal: true,
      });
      store.append({
        sourceText: "world",
        language: "source",
        text: "world",
        isFinal: true,
      });

      await store.flush();

      const result = await db.execute({
        sql: "SELECT * FROM transcript_segments WHERE session_id = ? ORDER BY sequence",
        args: [sessionId],
      });

      expect(result.rows).toHaveLength(3);
      expect(result.rows[0]!.source_text).toBe("hello");
      expect(result.rows[0]!.language).toBe("source");
      expect(result.rows[1]!.language).toBe("es");
      expect(result.rows[1]!.text).toBe("hola");
    });

    it("clears the buffer after flushing", async () => {
      store.append({
        sourceText: "hello",
        language: "source",
        text: "hello",
        isFinal: true,
      });
      await store.flush();
      expect(store.segmentCount).toBe(0);
    });

    it("handles empty buffer without error", async () => {
      await store.flush();
      const result = await db.execute({
        sql: "SELECT * FROM transcript_segments WHERE session_id = ?",
        args: [sessionId],
      });
      expect(result.rows).toHaveLength(0);
    });
  });
});
