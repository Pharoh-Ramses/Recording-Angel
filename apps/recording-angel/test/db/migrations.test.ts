import { describe, it, expect, beforeEach } from "bun:test";
import { createClient, type Client } from "@libsql/client";
import {
  migrateControl,
  migrateWard,
  migrateStake,
} from "../../src/db/migrations";

describe("migrateControl", () => {
  let db: Client;

  beforeEach(() => {
    db = createClient({ url: ":memory:" });
  });

  it("creates the organizations table", async () => {
    await migrateControl(db);
    const result = await db.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='organizations'",
    );
    expect(result.rows).toHaveLength(1);
  });

  it("is idempotent", async () => {
    await migrateControl(db);
    await migrateControl(db);
    const result = await db.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='organizations'",
    );
    expect(result.rows).toHaveLength(1);
  });
});

describe("migrateWard", () => {
  let db: Client;

  beforeEach(() => {
    db = createClient({ url: ":memory:" });
  });

  it("creates sessions and transcript_segments tables", async () => {
    await migrateWard(db);
    const result = await db.execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
    const tables = result.rows.map((r) => r.name);
    expect(tables).toContain("sessions");
    expect(tables).toContain("transcript_segments");
  });

  it("does not create ward_databases table", async () => {
    await migrateWard(db);
    const result = await db.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='ward_databases'",
    );
    expect(result.rows).toHaveLength(0);
  });
});

describe("migrateStake", () => {
  let db: Client;

  beforeEach(() => {
    db = createClient({ url: ":memory:" });
  });

  it("creates sessions, transcript_segments, and ward_databases tables", async () => {
    await migrateStake(db);
    const result = await db.execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
    const tables = result.rows.map((r) => r.name);
    expect(tables).toContain("sessions");
    expect(tables).toContain("transcript_segments");
    expect(tables).toContain("ward_databases");
  });
});
