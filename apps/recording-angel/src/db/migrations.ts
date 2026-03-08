import type { Client } from "@libsql/client";

const SESSIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    join_code TEXT NOT NULL UNIQUE,
    host_token TEXT NOT NULL,
    source_lang TEXT NOT NULL,
    target_langs TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting',
    started_at TEXT,
    ended_at TEXT,
    created_at TEXT NOT NULL,
    listener_count INTEGER DEFAULT 0
  )`;

const TRANSCRIPT_SEGMENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS transcript_segments (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    sequence INTEGER NOT NULL,
    source_text TEXT NOT NULL,
    language TEXT NOT NULL,
    text TEXT NOT NULL,
    is_final INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`;

const SEGMENTS_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_segments_session
  ON transcript_segments(session_id)`;

const CONTROL_ORGANIZATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    org_type TEXT NOT NULL,
    org_id TEXT NOT NULL,
    stake_id TEXT,
    db_url TEXT NOT NULL,
    db_token TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`;

const CONTROL_ORG_INDEX = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_org_type_id
  ON organizations(org_type, org_id)`;

const WARD_DATABASES_TABLE = `
  CREATE TABLE IF NOT EXISTS ward_databases (
    ward_id TEXT PRIMARY KEY,
    db_url TEXT NOT NULL,
    db_token TEXT NOT NULL
  )`;

export async function migrateControl(db: Client): Promise<void> {
  await db.batch(
    [
      { sql: CONTROL_ORGANIZATIONS_TABLE, args: [] },
      { sql: CONTROL_ORG_INDEX, args: [] },
    ],
    "write",
  );
}

export async function migrateWard(db: Client): Promise<void> {
  await db.batch(
    [
      { sql: SESSIONS_TABLE, args: [] },
      { sql: TRANSCRIPT_SEGMENTS_TABLE, args: [] },
      { sql: SEGMENTS_INDEX, args: [] },
    ],
    "write",
  );
}

export async function migrateStake(db: Client): Promise<void> {
  await db.batch(
    [
      { sql: SESSIONS_TABLE, args: [] },
      { sql: TRANSCRIPT_SEGMENTS_TABLE, args: [] },
      { sql: SEGMENTS_INDEX, args: [] },
      { sql: WARD_DATABASES_TABLE, args: [] },
    ],
    "write",
  );
}
