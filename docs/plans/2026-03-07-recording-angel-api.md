# Recording Angel API Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a real-time speech-to-text translation API using Bun WebSocket, Deepgram, OpenAI, and Turso with deep module philosophy.

**Architecture:** Single Bun WebSocket server where one `Session` class hides all pipeline complexity (Deepgram streaming, OpenAI translation, multi-language fan-out, Turso persistence) behind a tiny public API. Multi-tenant storage with per-ward and per-stake Turso databases, managed by a global control database. Dependency injection throughout for TDD.

**Tech Stack:** Bun, Bun WebSocket, Deepgram WebSocket API (native, no SDK), OpenAI gpt-4o-mini, Turso (@libsql/client), bun:test

**Design doc:** `docs/plans/2026-03-07-recording-angel-api-design.md`

---

### Task 1: Project Scaffolding

**Files:**

- Create: `apps/recording-angel/package.json`
- Create: `apps/recording-angel/tsconfig.json`
- Create: `apps/recording-angel/.env.example`
- Create: `apps/recording-angel/src/index.ts`
- Modify: `turbo.json`

**Step 1: Create package.json**

```json
{
  "name": "@repo/recording-angel",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target bun",
    "test": "bun test",
    "check-types": "tsc --noEmit",
    "lint": "eslint ."
  },
  "dependencies": {
    "@libsql/client": "^0.15.0",
    "openai": "^4.85.0"
  },
  "devDependencies": {
    "@repo/eslint-config": "workspace:*",
    "@repo/typescript-config": "workspace:*",
    "@types/bun": "latest",
    "typescript": "^5.9.2"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "types": ["bun-types"]
  },
  "include": ["src", "test"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create .env.example**

```env
PORT=3001
API_KEY=your-api-key-here
DEEPGRAM_API_KEY=your-deepgram-key
OPENAI_API_KEY=your-openai-key
TURSO_CONTROL_DB_URL=libsql://your-control-db.turso.io
TURSO_CONTROL_DB_TOKEN=your-control-db-token
TURSO_ORG=your-turso-org
TURSO_API_TOKEN=your-turso-platform-api-token
```

**Step 4: Create minimal entry point**

Create `apps/recording-angel/src/index.ts`:

```typescript
const PORT = Number(process.env.PORT) || 3001;

const server = Bun.serve({
  port: PORT,
  fetch(req) {
    return new Response("Recording Angel API", { status: 200 });
  },
});

console.log(`Recording Angel API running on port ${server.port}`);
```

**Step 5: Update turbo.json to add test task**

Add `"test"` task to `turbo.json` tasks:

```json
"test": {
  "dependsOn": ["^build"],
  "inputs": ["src/**", "test/**"]
}
```

**Step 6: Install dependencies and verify**

Run: `bun install` from monorepo root.
Run: `bun run dev` from `apps/recording-angel` — verify server starts on port 3001.
Run: `bun test` from `apps/recording-angel` — verify test runner works (no tests yet, exits clean).

**Step 7: Commit**

```
feat(recording-angel): scaffold project with bun server entry point
```

---

### Task 2: Error Types & Auth Module

**Files:**

- Create: `apps/recording-angel/src/errors.ts`
- Create: `apps/recording-angel/src/auth.ts`
- Create: `apps/recording-angel/test/auth.test.ts`

**Step 1: Write failing auth tests**

Create `apps/recording-angel/test/auth.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import {
  generateJoinCode,
  generateHostToken,
  validateApiKey,
} from "../src/auth";

describe("generateJoinCode", () => {
  it("returns a 6-character string", () => {
    const code = generateJoinCode();
    expect(code).toHaveLength(6);
  });

  it("only contains unambiguous characters (no 0, O, 1, I)", () => {
    // Generate many codes to increase confidence
    for (let i = 0; i < 100; i++) {
      const code = generateJoinCode();
      expect(code).not.toMatch(/[0O1I]/);
    }
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateJoinCode()));
    expect(codes.size).toBe(50);
  });
});

describe("generateHostToken", () => {
  it("returns a valid UUID", () => {
    const token = generateHostToken();
    expect(token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("generates unique tokens", () => {
    const a = generateHostToken();
    const b = generateHostToken();
    expect(a).not.toBe(b);
  });
});

describe("validateApiKey", () => {
  const expected = "sk-test-key-12345";

  it("returns true for matching key", () => {
    expect(validateApiKey("sk-test-key-12345", expected)).toBe(true);
  });

  it("returns false for wrong key", () => {
    expect(validateApiKey("sk-wrong-key", expected)).toBe(false);
  });

  it("returns false for null", () => {
    expect(validateApiKey(null, expected)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(validateApiKey("", expected)).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test test/auth.test.ts` from `apps/recording-angel`
Expected: FAIL — modules don't exist yet.

**Step 3: Implement error types**

Create `apps/recording-angel/src/errors.ts`:

```typescript
export class RecordingAngelError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "RecordingAngelError";
  }
}

export class SessionNotFoundError extends RecordingAngelError {
  constructor(identifier: string) {
    super(`Session not found: ${identifier}`, "SESSION_NOT_FOUND");
  }
}

export class SessionAlreadyHostedError extends RecordingAngelError {
  constructor() {
    super("Session already has a host connected", "SESSION_ALREADY_HOSTED");
  }
}

export class InvalidTokenError extends RecordingAngelError {
  constructor() {
    super("Invalid or expired token", "INVALID_TOKEN");
  }
}

export class UnauthorizedError extends RecordingAngelError {
  constructor() {
    super("Invalid API key", "UNAUTHORIZED");
  }
}

export class SessionEndedError extends RecordingAngelError {
  constructor() {
    super("Session has already ended", "SESSION_ENDED");
  }
}
```

**Step 4: Implement auth module**

Create `apps/recording-angel/src/auth.ts`:

```typescript
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateJoinCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARS[bytes[i]! % CHARS.length];
  }
  return code;
}

export function generateHostToken(): string {
  return crypto.randomUUID();
}

export function validateApiKey(
  provided: string | null,
  expected: string,
): boolean {
  if (!provided || provided.length === 0) return false;

  const a = new TextEncoder().encode(provided);
  const b = new TextEncoder().encode(expected);

  if (a.byteLength !== b.byteLength) return false;

  // Constant-time comparison
  let mismatch = 0;
  for (let i = 0; i < a.byteLength; i++) {
    mismatch |= a[i]! ^ b[i]!;
  }
  return mismatch === 0;
}
```

**Step 5: Run tests to verify they pass**

Run: `bun test test/auth.test.ts`
Expected: all 7 tests PASS.

**Step 6: Commit**

```
feat(recording-angel): add error types and auth module with TDD
```

---

### Task 3: Database Schema & Migrations

**Files:**

- Create: `apps/recording-angel/src/db/migrations.ts`
- Create: `apps/recording-angel/test/db/migrations.test.ts`

**Step 1: Write failing migration tests**

Create `apps/recording-angel/test/db/migrations.test.ts`:

```typescript
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
```

**Step 2: Run tests to verify they fail**

Run: `bun test test/db/migrations.test.ts`
Expected: FAIL — module doesn't exist.

**Step 3: Implement migrations**

Create `apps/recording-angel/src/db/migrations.ts`:

```typescript
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
```

**Step 4: Run tests to verify they pass**

Run: `bun test test/db/migrations.test.ts`
Expected: all 5 tests PASS.

**Step 5: Commit**

```
feat(recording-angel): add database schema and migration functions
```

---

### Task 4: Database Client & Control DB Operations

**Files:**

- Create: `apps/recording-angel/src/db/client.ts`
- Create: `apps/recording-angel/src/db/control.ts`
- Create: `apps/recording-angel/test/db/control.test.ts`

**Step 1: Write failing control DB tests**

Create `apps/recording-angel/test/db/control.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "bun:test";
import { createClient, type Client } from "@libsql/client";
import { migrateControl } from "../../src/db/migrations";
import {
  registerOrganization,
  findOrganization,
  type OrganizationRecord,
} from "../../src/db/control";

describe("control db operations", () => {
  let db: Client;

  beforeEach(async () => {
    db = createClient({ url: ":memory:" });
    await migrateControl(db);
  });

  describe("registerOrganization", () => {
    it("inserts a new ward organization", async () => {
      const org = await registerOrganization(db, {
        orgType: "ward",
        orgId: "ward-123",
        stakeId: "stake-456",
        dbUrl: "libsql://ward-123.turso.io",
        dbToken: "token-abc",
      });

      expect(org.orgType).toBe("ward");
      expect(org.orgId).toBe("ward-123");
      expect(org.stakeId).toBe("stake-456");
      expect(org.dbUrl).toBe("libsql://ward-123.turso.io");
      expect(org.id).toBeDefined();
    });

    it("inserts a new stake organization with null stakeId", async () => {
      const org = await registerOrganization(db, {
        orgType: "stake",
        orgId: "stake-456",
        stakeId: null,
        dbUrl: "libsql://stake-456.turso.io",
        dbToken: "token-xyz",
      });

      expect(org.stakeId).toBeNull();
    });
  });

  describe("findOrganization", () => {
    it("returns the organization when found", async () => {
      await registerOrganization(db, {
        orgType: "ward",
        orgId: "ward-123",
        stakeId: "stake-456",
        dbUrl: "libsql://ward-123.turso.io",
        dbToken: "token-abc",
      });

      const found = await findOrganization(db, "ward", "ward-123");
      expect(found).not.toBeNull();
      expect(found!.dbUrl).toBe("libsql://ward-123.turso.io");
    });

    it("returns null when not found", async () => {
      const found = await findOrganization(db, "ward", "nonexistent");
      expect(found).toBeNull();
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test test/db/control.test.ts`
Expected: FAIL — modules don't exist.

**Step 3: Implement client factory**

Create `apps/recording-angel/src/db/client.ts`:

```typescript
import { createClient, type Client } from "@libsql/client";

export function createDb(url: string, authToken?: string): Client {
  return createClient({ url, authToken });
}

export function createMemoryDb(): Client {
  return createClient({ url: ":memory:" });
}
```

**Step 4: Implement control DB operations**

Create `apps/recording-angel/src/db/control.ts`:

```typescript
import type { Client } from "@libsql/client";

export interface OrganizationRecord {
  id: string;
  orgType: "ward" | "stake";
  orgId: string;
  stakeId: string | null;
  dbUrl: string;
  dbToken: string;
  createdAt: string;
}

interface RegisterInput {
  orgType: "ward" | "stake";
  orgId: string;
  stakeId: string | null;
  dbUrl: string;
  dbToken: string;
}

export async function registerOrganization(
  db: Client,
  input: RegisterInput,
): Promise<OrganizationRecord> {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO organizations (id, org_type, org_id, stake_id, db_url, db_token, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.orgType,
      input.orgId,
      input.stakeId,
      input.dbUrl,
      input.dbToken,
      createdAt,
    ],
  });

  return {
    id,
    orgType: input.orgType,
    orgId: input.orgId,
    stakeId: input.stakeId,
    dbUrl: input.dbUrl,
    dbToken: input.dbToken,
    createdAt,
  };
}

export async function findOrganization(
  db: Client,
  orgType: "ward" | "stake",
  orgId: string,
): Promise<OrganizationRecord | null> {
  const result = await db.execute({
    sql: "SELECT * FROM organizations WHERE org_type = ? AND org_id = ?",
    args: [orgType, orgId],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0]!;
  return {
    id: row.id as string,
    orgType: row.org_type as "ward" | "stake",
    orgId: row.org_id as string,
    stakeId: (row.stake_id as string) ?? null,
    dbUrl: row.db_url as string,
    dbToken: row.db_token as string,
    createdAt: row.created_at as string,
  };
}
```

**Step 5: Run tests to verify they pass**

Run: `bun test test/db/control.test.ts`
Expected: all 4 tests PASS.

**Step 6: Commit**

```
feat(recording-angel): add database client factory and control db operations
```

---

### Task 5: Database Provisioner

**Files:**

- Create: `apps/recording-angel/src/db/provisioner.ts`
- Create: `apps/recording-angel/test/db/provisioner.test.ts`

The provisioner lazily creates Turso databases via their platform API. In tests, we mock the Turso API and use in-memory SQLite.

**Step 1: Write failing provisioner tests**

Create `apps/recording-angel/test/db/provisioner.test.ts`:

```typescript
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { createClient, type Client } from "@libsql/client";
import { migrateControl } from "../../src/db/migrations";
import { Provisioner, type TursoApiClient } from "../../src/db/provisioner";

function createMockTursoApi(): TursoApiClient {
  let dbCounter = 0;
  return {
    createDatabase: mock(async (name: string) => {
      dbCounter++;
      return {
        dbUrl: `libsql://${name}.turso.io`,
        dbToken: `token-${dbCounter}`,
      };
    }),
  };
}

describe("Provisioner", () => {
  let controlDb: Client;
  let tursoApi: TursoApiClient;
  let provisioner: Provisioner;

  beforeEach(async () => {
    controlDb = createClient({ url: ":memory:" });
    await migrateControl(controlDb);
    tursoApi = createMockTursoApi();
    provisioner = new Provisioner(controlDb, tursoApi, (url: string) =>
      createClient({ url: ":memory:" }),
    );
  });

  it("creates a new database for a ward on first request", async () => {
    const db = await provisioner.getDatabase("ward", "ward-123", "stake-456");
    expect(db).toBeDefined();
    expect(tursoApi.createDatabase).toHaveBeenCalledTimes(1);
  });

  it("returns the same database on subsequent requests", async () => {
    await provisioner.getDatabase("ward", "ward-123", "stake-456");
    await provisioner.getDatabase("ward", "ward-123", "stake-456");
    expect(tursoApi.createDatabase).toHaveBeenCalledTimes(1);
  });

  it("creates separate databases for different wards", async () => {
    await provisioner.getDatabase("ward", "ward-123", "stake-456");
    await provisioner.getDatabase("ward", "ward-789", "stake-456");
    expect(tursoApi.createDatabase).toHaveBeenCalledTimes(2);
  });

  it("creates a stake database with null stakeId", async () => {
    const db = await provisioner.getDatabase("stake", "stake-456", null);
    expect(db).toBeDefined();
    expect(tursoApi.createDatabase).toHaveBeenCalledTimes(1);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test test/db/provisioner.test.ts`
Expected: FAIL — module doesn't exist.

**Step 3: Implement provisioner**

Create `apps/recording-angel/src/db/provisioner.ts`:

```typescript
import type { Client } from "@libsql/client";
import { registerOrganization, findOrganization } from "./control.js";
import { migrateWard, migrateStake } from "./migrations.js";

export interface TursoApiClient {
  createDatabase(name: string): Promise<{ dbUrl: string; dbToken: string }>;
}

type ClientFactory = (url: string, token?: string) => Client;

export class Provisioner {
  private cache = new Map<string, Client>();

  constructor(
    private controlDb: Client,
    private tursoApi: TursoApiClient,
    private createClient: ClientFactory,
  ) {}

  async getDatabase(
    orgType: "ward" | "stake",
    orgId: string,
    stakeId: string | null,
  ): Promise<Client> {
    const cacheKey = `${orgType}:${orgId}`;

    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const existing = await findOrganization(this.controlDb, orgType, orgId);

    if (existing) {
      const client = this.createClient(existing.dbUrl, existing.dbToken);
      this.cache.set(cacheKey, client);
      return client;
    }

    const dbName = `ra-${orgType}-${orgId}`.replace(/[^a-zA-Z0-9-]/g, "-");
    const { dbUrl, dbToken } = await this.tursoApi.createDatabase(dbName);

    const client = this.createClient(dbUrl, dbToken);

    if (orgType === "ward") {
      await migrateWard(client);
    } else {
      await migrateStake(client);
    }

    await registerOrganization(this.controlDb, {
      orgType,
      orgId,
      stakeId,
      dbUrl,
      dbToken,
    });

    this.cache.set(cacheKey, client);
    return client;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `bun test test/db/provisioner.test.ts`
Expected: all 4 tests PASS.

**Step 5: Commit**

```
feat(recording-angel): add lazy database provisioner with turso api integration
```

---

### Task 6: ListenerRegistry

Pure logic module — no external dependencies. Tracks listeners grouped by language, handles fan-out.

**Files:**

- Create: `apps/recording-angel/src/listener-registry.ts`
- Create: `apps/recording-angel/test/listener-registry.test.ts`

**Step 1: Write failing tests**

Create `apps/recording-angel/test/listener-registry.test.ts`:

```typescript
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { ListenerRegistry, type Listener } from "../src/listener-registry";

function mockListener(id: string, language: string): Listener {
  return { id, language, send: mock(() => {}) };
}

describe("ListenerRegistry", () => {
  let registry: ListenerRegistry;

  beforeEach(() => {
    registry = new ListenerRegistry();
  });

  describe("add/remove", () => {
    it("adds a listener", () => {
      const listener = mockListener("l1", "es");
      registry.add(listener);
      expect(registry.count).toBe(1);
    });

    it("removes a listener", () => {
      const listener = mockListener("l1", "es");
      registry.add(listener);
      registry.remove("l1");
      expect(registry.count).toBe(0);
    });

    it("ignores removing a nonexistent listener", () => {
      registry.remove("nonexistent");
      expect(registry.count).toBe(0);
    });
  });

  describe("activeLanguages", () => {
    it("returns unique languages of connected listeners", () => {
      registry.add(mockListener("l1", "es"));
      registry.add(mockListener("l2", "es"));
      registry.add(mockListener("l3", "pt"));
      expect(registry.activeLanguages).toEqual(["es", "pt"]);
    });

    it("returns empty array when no listeners", () => {
      expect(registry.activeLanguages).toEqual([]);
    });

    it("updates when listeners disconnect", () => {
      registry.add(mockListener("l1", "es"));
      registry.add(mockListener("l2", "pt"));
      registry.remove("l2");
      expect(registry.activeLanguages).toEqual(["es"]);
    });
  });

  describe("switchLanguage", () => {
    it("moves a listener to a new language group", () => {
      const listener = mockListener("l1", "es");
      registry.add(listener);
      registry.switchLanguage("l1", "pt");
      expect(registry.activeLanguages).toEqual(["pt"]);
    });
  });

  describe("broadcast", () => {
    it("sends to all listeners of a given language", () => {
      const l1 = mockListener("l1", "es");
      const l2 = mockListener("l2", "es");
      const l3 = mockListener("l3", "pt");
      registry.add(l1);
      registry.add(l2);
      registry.add(l3);

      registry.broadcast("es", "hola mundo");
      expect(l1.send).toHaveBeenCalledWith("hola mundo");
      expect(l2.send).toHaveBeenCalledWith("hola mundo");
      expect(l3.send).not.toHaveBeenCalled();
    });

    it("does nothing for a language with no listeners", () => {
      registry.broadcast("zh", "hello");
      // No error thrown
    });
  });

  describe("broadcastAll", () => {
    it("sends to every connected listener regardless of language", () => {
      const l1 = mockListener("l1", "es");
      const l2 = mockListener("l2", "pt");
      registry.add(l1);
      registry.add(l2);

      registry.broadcastAll("session ended");
      expect(l1.send).toHaveBeenCalledWith("session ended");
      expect(l2.send).toHaveBeenCalledWith("session ended");
    });
  });

  describe("peakCount", () => {
    it("tracks the maximum number of concurrent listeners", () => {
      registry.add(mockListener("l1", "es"));
      registry.add(mockListener("l2", "pt"));
      registry.add(mockListener("l3", "es"));
      registry.remove("l3");
      expect(registry.peakCount).toBe(3);
      expect(registry.count).toBe(2);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test test/listener-registry.test.ts`
Expected: FAIL — module doesn't exist.

**Step 3: Implement ListenerRegistry**

Create `apps/recording-angel/src/listener-registry.ts`:

```typescript
export interface Listener {
  id: string;
  language: string;
  send: (data: string) => void;
}

export class ListenerRegistry {
  private listeners = new Map<string, Listener>();
  private _peakCount = 0;

  get count(): number {
    return this.listeners.size;
  }

  get peakCount(): number {
    return this._peakCount;
  }

  get activeLanguages(): string[] {
    const langs = new Set<string>();
    for (const listener of this.listeners.values()) {
      langs.add(listener.language);
    }
    return [...langs];
  }

  add(listener: Listener): void {
    this.listeners.set(listener.id, listener);
    if (this.listeners.size > this._peakCount) {
      this._peakCount = this.listeners.size;
    }
  }

  remove(id: string): void {
    this.listeners.delete(id);
  }

  switchLanguage(id: string, newLanguage: string): void {
    const listener = this.listeners.get(id);
    if (listener) {
      listener.language = newLanguage;
    }
  }

  broadcast(language: string, data: string): void {
    for (const listener of this.listeners.values()) {
      if (listener.language === language) {
        listener.send(data);
      }
    }
  }

  broadcastAll(data: string): void {
    for (const listener of this.listeners.values()) {
      listener.send(data);
    }
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `bun test test/listener-registry.test.ts`
Expected: all 11 tests PASS.

**Step 5: Commit**

```
feat(recording-angel): add listener registry with language-based fan-out
```

---

### Task 7: TranscriptStore

In-memory buffer that flushes to SQLite on session end.

**Files:**

- Create: `apps/recording-angel/src/transcript-store.ts`
- Create: `apps/recording-angel/test/transcript-store.test.ts`

**Step 1: Write failing tests**

Create `apps/recording-angel/test/transcript-store.test.ts`:

```typescript
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
```

**Step 2: Run tests to verify they fail**

Run: `bun test test/transcript-store.test.ts`
Expected: FAIL — module doesn't exist.

**Step 3: Implement TranscriptStore**

Create `apps/recording-angel/src/transcript-store.ts`:

```typescript
import type { Client } from "@libsql/client";

export interface SegmentInput {
  sourceText: string;
  language: string;
  text: string;
  isFinal: boolean;
}

export interface Segment extends SegmentInput {
  id: string;
  sequence: number;
  createdAt: string;
}

export class TranscriptStore {
  private buffer: Segment[] = [];
  private nextSequence = 0;

  constructor(
    private sessionId: string,
    private db: Client,
  ) {}

  get segmentCount(): number {
    return this.buffer.length;
  }

  getBuffer(): ReadonlyArray<Segment> {
    return this.buffer;
  }

  append(input: SegmentInput): Segment {
    const segment: Segment = {
      ...input,
      id: crypto.randomUUID(),
      sequence: this.nextSequence++,
      createdAt: new Date().toISOString(),
    };
    this.buffer.push(segment);
    return segment;
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const statements = this.buffer.map((seg) => ({
      sql: `INSERT INTO transcript_segments (id, session_id, sequence, source_text, language, text, is_final, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        seg.id,
        this.sessionId,
        seg.sequence,
        seg.sourceText,
        seg.language,
        seg.text,
        seg.isFinal ? 1 : 0,
        seg.createdAt,
      ] as (string | number)[],
    }));

    await this.db.batch(statements, "write");
    this.buffer = [];
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `bun test test/transcript-store.test.ts`
Expected: all 5 tests PASS.

**Step 5: Commit**

```
feat(recording-angel): add transcript store with in-memory buffer and sqlite flush
```

---

### Task 8: DeepgramStream

Wraps a WebSocket connection to Deepgram's real-time STT API. In tests, we run a mock WebSocket server that mimics Deepgram's response format.

**Files:**

- Create: `apps/recording-angel/src/deepgram-stream.ts`
- Create: `apps/recording-angel/test/helpers/mock-deepgram.ts`
- Create: `apps/recording-angel/test/deepgram-stream.test.ts`

**Step 1: Create mock Deepgram server**

Create `apps/recording-angel/test/helpers/mock-deepgram.ts`:

```typescript
/**
 * A minimal fake Deepgram WebSocket server for testing.
 * Receives binary audio data, responds with mock transcript events.
 */
export interface MockDeepgramServer {
  url: string;
  port: number;
  close: () => void;
  emitTranscript: (text: string, isFinal: boolean) => void;
}

export function startMockDeepgram(): MockDeepgramServer {
  const clients = new Set<any>();

  const server = Bun.serve({
    port: 0, // random available port
    fetch(req, server) {
      if (server.upgrade(req)) return;
      return new Response("Not found", { status: 404 });
    },
    websocket: {
      open(ws) {
        clients.add(ws);
      },
      message(_ws, _message) {
        // Receive audio data — in mock, we ignore it.
        // Transcripts are emitted via emitTranscript().
      },
      close(ws) {
        clients.delete(ws);
      },
    },
  });

  return {
    url: `ws://localhost:${server.port}`,
    port: server.port,
    close: () => server.stop(true),
    emitTranscript(text: string, isFinal: boolean) {
      const payload = JSON.stringify({
        type: "Results",
        is_final: isFinal,
        speech_final: isFinal,
        channel: {
          alternatives: [{ transcript: text, confidence: 0.99 }],
        },
      });
      for (const ws of clients) {
        ws.send(payload);
      }
    },
  };
}
```

**Step 2: Write failing DeepgramStream tests**

Create `apps/recording-angel/test/deepgram-stream.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import {
  startMockDeepgram,
  type MockDeepgramServer,
} from "./helpers/mock-deepgram";
import { DeepgramStream, type TranscriptEvent } from "../src/deepgram-stream";

describe("DeepgramStream", () => {
  let mockServer: MockDeepgramServer;

  beforeEach(() => {
    mockServer = startMockDeepgram();
  });

  afterEach(() => {
    mockServer.close();
  });

  it("emits transcript events for final results", async () => {
    const events: TranscriptEvent[] = [];
    const stream = new DeepgramStream({
      url: mockServer.url,
      apiKey: "test-key",
      language: "en",
      onTranscript: (event) => events.push(event),
      onError: () => {},
    });

    await stream.connect();

    mockServer.emitTranscript("hello world", true);
    // Allow message propagation
    await Bun.sleep(50);

    expect(events).toHaveLength(1);
    expect(events[0]!.text).toBe("hello world");
    expect(events[0]!.isFinal).toBe(true);

    stream.close();
  });

  it("emits transcript events for interim results", async () => {
    const events: TranscriptEvent[] = [];
    const stream = new DeepgramStream({
      url: mockServer.url,
      apiKey: "test-key",
      language: "en",
      onTranscript: (event) => events.push(event),
      onError: () => {},
    });

    await stream.connect();

    mockServer.emitTranscript("hel", false);
    await Bun.sleep(50);

    expect(events).toHaveLength(1);
    expect(events[0]!.isFinal).toBe(false);

    stream.close();
  });

  it("ignores empty transcripts", async () => {
    const events: TranscriptEvent[] = [];
    const stream = new DeepgramStream({
      url: mockServer.url,
      apiKey: "test-key",
      language: "en",
      onTranscript: (event) => events.push(event),
      onError: () => {},
    });

    await stream.connect();

    mockServer.emitTranscript("", true);
    await Bun.sleep(50);

    expect(events).toHaveLength(0);

    stream.close();
  });

  it("forwards audio data to the server", async () => {
    const stream = new DeepgramStream({
      url: mockServer.url,
      apiKey: "test-key",
      language: "en",
      onTranscript: () => {},
      onError: () => {},
    });

    await stream.connect();

    const audio = new Uint8Array([1, 2, 3, 4]);
    stream.sendAudio(audio.buffer);
    // No error thrown

    stream.close();
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `bun test test/deepgram-stream.test.ts`
Expected: FAIL — module doesn't exist.

**Step 4: Implement DeepgramStream**

Create `apps/recording-angel/src/deepgram-stream.ts`:

```typescript
export interface TranscriptEvent {
  text: string;
  isFinal: boolean;
}

export interface DeepgramStreamConfig {
  url?: string; // Override for testing; defaults to Deepgram's API
  apiKey: string;
  language: string;
  onTranscript: (event: TranscriptEvent) => void;
  onError: (error: Error) => void;
}

const DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen";

export class DeepgramStream {
  private ws: WebSocket | null = null;
  private config: DeepgramStreamConfig;

  constructor(config: DeepgramStreamConfig) {
    this.config = config;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const baseUrl = this.config.url ?? DEEPGRAM_WS_URL;
      const params = new URLSearchParams({
        encoding: "linear16",
        sample_rate: "16000",
        language: this.config.language,
        model: "nova-2",
        punctuate: "true",
        interim_results: "true",
      });

      const url = `${baseUrl}?${params}`;

      this.ws = new WebSocket(url, {
        headers: {
          Authorization: `Token ${this.config.apiKey}`,
        },
      } as any);

      this.ws.onopen = () => resolve();

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          if (data.type !== "Results") return;

          const transcript = data.channel?.alternatives?.[0]?.transcript ?? "";
          if (transcript.length === 0) return;

          this.config.onTranscript({
            text: transcript,
            isFinal: data.is_final ?? false,
          });
        } catch (err) {
          this.config.onError(
            err instanceof Error ? err : new Error(String(err)),
          );
        }
      };

      this.ws.onerror = (event) => {
        const error = new Error("Deepgram WebSocket error");
        this.config.onError(error);
        reject(error);
      };

      this.ws.onclose = () => {
        this.ws = null;
      };
    });
  }

  sendAudio(data: ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

**Step 5: Run tests to verify they pass**

Run: `bun test test/deepgram-stream.test.ts`
Expected: all 4 tests PASS.

**Step 6: Commit**

```
feat(recording-angel): add deepgram stream with mock server for testing
```

---

### Task 9: TranslationQueue

Batches final transcript segments and translates via OpenAI. Only translates to languages with active listeners.

**Files:**

- Create: `apps/recording-angel/src/translation-queue.ts`
- Create: `apps/recording-angel/test/helpers/mock-openai.ts`
- Create: `apps/recording-angel/test/translation-queue.test.ts`

**Step 1: Create mock OpenAI translator**

Create `apps/recording-angel/test/helpers/mock-openai.ts`:

```typescript
import type { Translator } from "../../src/translation-queue";

/**
 * Returns a mock translator that prefixes text with the target language.
 * e.g., translate("hello", "en", "es") => "[es] hello"
 */
export function createMockTranslator(): Translator {
  return {
    translate: async (
      text: string,
      _sourceLang: string,
      targetLang: string,
    ) => {
      return `[${targetLang}] ${text}`;
    },
  };
}
```

**Step 2: Write failing TranslationQueue tests**

Create `apps/recording-angel/test/translation-queue.test.ts`:

```typescript
import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
  TranslationQueue,
  type TranslationResult,
} from "../src/translation-queue";
import { createMockTranslator } from "./helpers/mock-openai";

describe("TranslationQueue", () => {
  let queue: TranslationQueue;
  let results: TranslationResult[];

  beforeEach(() => {
    results = [];
    queue = new TranslationQueue({
      translator: createMockTranslator(),
      sourceLang: "en",
      onTranslation: (result) => results.push(result),
    });
  });

  it("translates text to all requested languages in parallel", async () => {
    await queue.translate("hello world", ["es", "pt"]);

    expect(results).toHaveLength(2);
    expect(results.find((r) => r.language === "es")!.text).toBe(
      "[es] hello world",
    );
    expect(results.find((r) => r.language === "pt")!.text).toBe(
      "[pt] hello world",
    );
  });

  it("includes the source text in each result", async () => {
    await queue.translate("hello", ["es"]);
    expect(results[0]!.sourceText).toBe("hello");
  });

  it("does nothing when languages array is empty", async () => {
    await queue.translate("hello", []);
    expect(results).toHaveLength(0);
  });

  it("handles translation errors gracefully", async () => {
    const errors: Error[] = [];
    const failingQueue = new TranslationQueue({
      translator: {
        translate: async () => {
          throw new Error("API down");
        },
      },
      sourceLang: "en",
      onTranslation: (result) => results.push(result),
      onError: (err) => errors.push(err),
    });

    await failingQueue.translate("hello", ["es"]);
    expect(results).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `bun test test/translation-queue.test.ts`
Expected: FAIL — module doesn't exist.

**Step 4: Implement TranslationQueue**

Create `apps/recording-angel/src/translation-queue.ts`:

```typescript
export interface Translator {
  translate(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<string>;
}

export interface TranslationResult {
  sourceText: string;
  language: string;
  text: string;
}

export interface TranslationQueueConfig {
  translator: Translator;
  sourceLang: string;
  onTranslation: (result: TranslationResult) => void;
  onError?: (error: Error) => void;
}

export class TranslationQueue {
  private config: TranslationQueueConfig;

  constructor(config: TranslationQueueConfig) {
    this.config = config;
  }

  async translate(text: string, targetLanguages: string[]): Promise<void> {
    if (targetLanguages.length === 0) return;

    const tasks = targetLanguages.map(async (lang) => {
      try {
        const translated = await this.config.translator.translate(
          text,
          this.config.sourceLang,
          lang,
        );
        this.config.onTranslation({
          sourceText: text,
          language: lang,
          text: translated,
        });
      } catch (err) {
        this.config.onError?.(
          err instanceof Error ? err : new Error(String(err)),
        );
      }
    });

    await Promise.all(tasks);
  }
}
```

**Step 5: Run tests to verify they pass**

Run: `bun test test/translation-queue.test.ts`
Expected: all 4 tests PASS.

**Step 6: Commit**

```
feat(recording-angel): add translation queue with parallel language dispatch
```

---

### Task 10: OpenAI Translator Implementation

The `Translator` interface from Task 9 needs a real implementation that calls OpenAI.

**Files:**

- Create: `apps/recording-angel/src/openai-translator.ts`
- Create: `apps/recording-angel/test/openai-translator.test.ts`

**Step 1: Write failing tests**

Create `apps/recording-angel/test/openai-translator.test.ts`:

```typescript
import { describe, it, expect, mock } from "bun:test";
import { OpenAITranslator } from "../src/openai-translator";

describe("OpenAITranslator", () => {
  it("calls openai with the correct prompt structure", async () => {
    const mockCreate = mock(async () => ({
      choices: [{ message: { content: "hola mundo" } }],
    }));

    const translator = new OpenAITranslator({
      create: mockCreate as any,
    });

    const result = await translator.translate("hello world", "en", "es");

    expect(result).toBe("hola mundo");
    expect(mockCreate).toHaveBeenCalledTimes(1);

    const callArgs = mockCreate.mock.calls[0]![0] as any;
    expect(callArgs.model).toBe("gpt-4o-mini");
    expect(callArgs.messages).toHaveLength(2);
    expect(callArgs.messages[1].content).toContain("hello world");
  });

  it("trims whitespace from response", async () => {
    const translator = new OpenAITranslator({
      create: mock(async () => ({
        choices: [{ message: { content: "  hola mundo  \n" } }],
      })) as any,
    });

    const result = await translator.translate("hello world", "en", "es");
    expect(result).toBe("hola mundo");
  });

  it("throws when response has no content", async () => {
    const translator = new OpenAITranslator({
      create: mock(async () => ({
        choices: [{ message: { content: null } }],
      })) as any,
    });

    expect(translator.translate("hello", "en", "es")).rejects.toThrow();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test test/openai-translator.test.ts`
Expected: FAIL — module doesn't exist.

**Step 3: Implement OpenAITranslator**

Create `apps/recording-angel/src/openai-translator.ts`:

```typescript
import type { Translator } from "./translation-queue.js";

interface ChatCompletionsAPI {
  create(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature: number;
    max_tokens: number;
  }): Promise<{
    choices: Array<{ message: { content: string | null } }>;
  }>;
}

export class OpenAITranslator implements Translator {
  constructor(private completions: ChatCompletionsAPI) {}

  async translate(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<string> {
    const response = await this.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a translator. Translate the following text from ${sourceLang} to ${targetLang}. Return ONLY the translation, nothing else. Preserve formatting and punctuation.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No translation content in OpenAI response");
    }

    return content.trim();
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `bun test test/openai-translator.test.ts`
Expected: all 3 tests PASS.

**Step 5: Commit**

```
feat(recording-angel): add openai translator implementation
```

---

### Task 11: Session (The Deep Module)

The core class that wires everything together. Simple public API, complex internals. Uses dependency injection so every sub-component is mockable in tests.

**Files:**

- Create: `apps/recording-angel/src/session.ts`
- Create: `apps/recording-angel/test/session.test.ts`

**Step 1: Write failing Session tests**

Create `apps/recording-angel/test/session.test.ts`:

```typescript
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

      // Both listeners should receive interim in source language
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
        (m: any) => m.type === "transcript" && m.isFinal,
      );
      const ptFinal = ptMsgs.find(
        (m: any) => m.type === "transcript" && m.isFinal,
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
```

**Step 2: Run tests to verify they fail**

Run: `bun test test/session.test.ts`
Expected: FAIL — module doesn't exist.

**Step 3: Implement Session**

Create `apps/recording-angel/src/session.ts`:

```typescript
import type { Client } from "@libsql/client";
import { DeepgramStream, type TranscriptEvent } from "./deepgram-stream.js";
import { TranslationQueue, type Translator } from "./translation-queue.js";
import { TranscriptStore } from "./transcript-store.js";
import { ListenerRegistry } from "./listener-registry.js";
import { SessionAlreadyHostedError, SessionEndedError } from "./errors.js";

export interface SessionConfig {
  id: string;
  joinCode: string;
  hostToken: string;
  sourceLang: string;
  targetLangs: string[];
}

export interface SessionDeps {
  db: Client;
  deepgramApiKey: string;
  deepgramUrl?: string;
  translator: Translator;
}

interface WsLike {
  send(data: string): void;
  close(): void;
}

type SessionStatus = "waiting" | "live" | "ended";

export class Session {
  private _status: SessionStatus = "waiting";
  private hostWs: WsLike | null = null;
  private deepgram: DeepgramStream | null = null;
  private translationQueue: TranslationQueue;
  private transcriptStore: TranscriptStore;
  private listeners: ListenerRegistry;
  private config: SessionConfig;

  constructor(
    config: SessionConfig,
    private deps: SessionDeps,
  ) {
    this.config = config;
    this.listeners = new ListenerRegistry();
    this.transcriptStore = new TranscriptStore(config.id, deps.db);

    this.translationQueue = new TranslationQueue({
      translator: deps.translator,
      sourceLang: config.sourceLang,
      onTranslation: (result) => {
        const message = JSON.stringify({
          type: "transcript",
          text: result.text,
          language: result.language,
          isFinal: true,
        });
        this.listeners.broadcast(result.language, message);

        this.transcriptStore.append({
          sourceText: result.sourceText,
          language: result.language,
          text: result.text,
          isFinal: true,
        });
      },
      onError: (err) => {
        console.error("Translation error:", err);
      },
    });
  }

  get status(): SessionStatus {
    return this._status;
  }

  get listenerCount(): number {
    return this.listeners.count;
  }

  get joinCode(): string {
    return this.config.joinCode;
  }

  get hostToken(): string {
    return this.config.hostToken;
  }

  async addHost(ws: WsLike): Promise<void> {
    if (this._status === "ended") throw new SessionEndedError();
    if (this.hostWs) throw new SessionAlreadyHostedError();

    this.hostWs = ws;

    this.deepgram = new DeepgramStream({
      url: this.deps.deepgramUrl,
      apiKey: this.deps.deepgramApiKey,
      language: this.config.sourceLang,
      onTranscript: (event) => this.handleTranscript(event),
      onError: (err) => console.error("Deepgram error:", err),
    });

    await this.deepgram.connect();
    this._status = "live";
  }

  addListener(id: string, ws: WsLike, language: string): void {
    this.listeners.add({
      id,
      language,
      send: (data) => ws.send(data),
    });
  }

  removeListener(id: string): void {
    this.listeners.remove(id);
  }

  switchListenerLanguage(id: string, language: string): void {
    this.listeners.switchLanguage(id, language);
  }

  onAudio(data: ArrayBuffer): void {
    this.deepgram?.sendAudio(data);
  }

  async end(): Promise<void> {
    if (this._status === "ended") return;

    this._status = "ended";

    this.deepgram?.close();
    this.deepgram = null;

    const endMessage = JSON.stringify({ type: "session:ended" });
    this.listeners.broadcastAll(endMessage);

    this.hostWs?.close();
    this.hostWs = null;

    await this.transcriptStore.flush();
  }

  private handleTranscript(event: TranscriptEvent): void {
    if (event.isFinal) {
      // Store source text
      this.transcriptStore.append({
        sourceText: event.text,
        language: "source",
        text: event.text,
        isFinal: true,
      });

      // Translate to all active listener languages
      const languages = this.listeners.activeLanguages;
      this.translationQueue.translate(event.text, languages);
    }

    // Broadcast interim (and final source) to all listeners
    const interimMessage = JSON.stringify({
      type: "transcript",
      text: event.text,
      language: this.config.sourceLang,
      isFinal: event.isFinal,
    });
    this.listeners.broadcastAll(interimMessage);
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `bun test test/session.test.ts`
Expected: all 8 tests PASS.

**Step 5: Commit**

```
feat(recording-angel): add session deep module wiring pipeline components
```

---

### Task 12: HTTP & WebSocket Handlers

Wire the Session into Bun.serve() with HTTP routes and WebSocket handling.

**Files:**

- Modify: `apps/recording-angel/src/index.ts`
- Create: `apps/recording-angel/src/server.ts`
- Create: `apps/recording-angel/test/server.test.ts`

**Step 1: Write failing server tests**

Create `apps/recording-angel/test/server.test.ts`:

```typescript
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
    port: 0, // random port
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
        body: JSON.stringify({
          wardId: "ward-123",
          stakeId: "stake-456",
          languages: ["es"],
        }),
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
        body: JSON.stringify({
          wardId: "ward-123",
          stakeId: "stake-456",
          languages: ["es"],
        }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /sessions/:code", () => {
    it("returns session info for a valid join code", async () => {
      // Create a session first
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
```

**Step 2: Run tests to verify they fail**

Run: `bun test test/server.test.ts`
Expected: FAIL — module doesn't exist.

**Step 3: Implement server**

Create `apps/recording-angel/src/server.ts`:

```typescript
import type { Client } from "@libsql/client";
import type { Server, ServerWebSocket } from "bun";
import { Session } from "./session.js";
import { validateApiKey, generateJoinCode, generateHostToken } from "./auth.js";
import type { Translator } from "./translation-queue.js";

export interface ServerConfig {
  port: number;
  apiKey: string;
  deepgramApiKey: string;
  deepgramUrl?: string;
  translator: Translator;
  getDatabase: (
    orgType: "ward" | "stake",
    orgId: string,
    stakeId: string | null,
  ) => Promise<Client>;
}

interface WsData {
  role: "host" | "listener";
  sessionId: string;
  listenerId?: string;
}

export function createServer(config: ServerConfig): Server {
  const sessions = new Map<string, Session>();
  const codeToSessionId = new Map<string, string>();

  function findSessionByCode(code: string): Session | undefined {
    const sessionId = codeToSessionId.get(code);
    if (!sessionId) return undefined;
    return sessions.get(sessionId);
  }

  return Bun.serve<WsData>({
    port: config.port,

    async fetch(req, server) {
      const url = new URL(req.url);

      // --- WebSocket upgrade ---
      if (url.pathname === "/ws") {
        if (
          server.upgrade(req, {
            data: { role: "pending", sessionId: "" } as any,
          })
        ) {
          return;
        }
        return new Response("WebSocket upgrade failed", { status: 400 });
      }

      // --- POST /sessions ---
      if (req.method === "POST" && url.pathname === "/sessions") {
        const authHeader = req.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "") ?? null;

        if (!validateApiKey(token, config.apiKey)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { wardId, stakeId, languages } = body;

        const sessionId = crypto.randomUUID();
        const joinCode = generateJoinCode();
        const hostToken = generateHostToken();

        const db = await config.getDatabase("ward", wardId, stakeId);

        const session = new Session(
          {
            id: sessionId,
            joinCode,
            hostToken,
            sourceLang: "en",
            targetLangs: languages,
          },
          {
            db,
            deepgramApiKey: config.deepgramApiKey,
            deepgramUrl: config.deepgramUrl,
            translator: config.translator,
          },
        );

        sessions.set(sessionId, session);
        codeToSessionId.set(joinCode, sessionId);

        return Response.json(
          { sessionId, joinCode, hostToken },
          { status: 201 },
        );
      }

      // --- GET /sessions/:code ---
      const sessionMatch = url.pathname.match(/^\/sessions\/([A-Z0-9]{6})$/);
      if (req.method === "GET" && sessionMatch) {
        const code = sessionMatch[1]!;
        const session = findSessionByCode(code);

        if (!session) {
          return Response.json({ error: "Session not found" }, { status: 404 });
        }

        return Response.json({
          sessionId: session.status,
          languages: [],
        });
      }

      return new Response("Not Found", { status: 404 });
    },

    websocket: {
      open(ws: ServerWebSocket<WsData>) {
        // Role is assigned on first message
      },

      async message(ws: ServerWebSocket<WsData>, message) {
        // Handle initial connection messages
        if (ws.data.role === ("pending" as any)) {
          try {
            const data = JSON.parse(message as string);

            if (data.type === "host:connect") {
              const session = [...sessions.values()].find(
                (s) => s.hostToken === data.token,
              );
              if (!session) {
                ws.send(
                  JSON.stringify({ type: "error", message: "Invalid token" }),
                );
                ws.close();
                return;
              }
              ws.data = { role: "host", sessionId: session.joinCode };
              await session.addHost(ws);
              ws.send(JSON.stringify({ type: "session:live" }));
              return;
            }

            if (data.type === "listener:connect") {
              const session = findSessionByCode(data.code);
              if (!session) {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    message: "Invalid join code",
                  }),
                );
                ws.close();
                return;
              }
              const listenerId = crypto.randomUUID();
              ws.data = {
                role: "listener",
                sessionId: data.code,
                listenerId,
              };
              session.addListener(listenerId, ws, data.language);
              return;
            }
          } catch {
            ws.send(
              JSON.stringify({ type: "error", message: "Invalid message" }),
            );
          }
          return;
        }

        // Handle ongoing messages
        if (ws.data.role === "host") {
          // Binary audio data
          if (message instanceof ArrayBuffer || message instanceof Buffer) {
            const session = findSessionByCode(ws.data.sessionId);
            session?.onAudio(
              message instanceof Buffer
                ? message.buffer.slice(
                    message.byteOffset,
                    message.byteOffset + message.byteLength,
                  )
                : message,
            );
          } else {
            try {
              const data = JSON.parse(message as string);
              if (data.type === "host:disconnect") {
                const session = findSessionByCode(ws.data.sessionId);
                await session?.end();
              }
            } catch {
              // Ignore parse errors
            }
          }
        }

        if (ws.data.role === "listener") {
          try {
            const data = JSON.parse(message as string);
            if (data.type === "listener:language") {
              const session = findSessionByCode(ws.data.sessionId);
              session?.switchListenerLanguage(
                ws.data.listenerId!,
                data.language,
              );
            }
          } catch {
            // Ignore parse errors
          }
        }
      },

      close(ws: ServerWebSocket<WsData>) {
        if (ws.data.role === "listener" && ws.data.listenerId) {
          const session = findSessionByCode(ws.data.sessionId);
          session?.removeListener(ws.data.listenerId);
        }
      },
    },
  });
}
```

**Step 4: Update index.ts entry point**

Replace `apps/recording-angel/src/index.ts` with:

```typescript
import OpenAI from "openai";
import { createClient } from "@libsql/client";
import { createServer } from "./server.js";
import { OpenAITranslator } from "./openai-translator.js";
import { Provisioner } from "./db/provisioner.js";
import { migrateControl } from "./db/migrations.js";

const PORT = Number(process.env.PORT) || 3001;
const API_KEY = process.env.API_KEY!;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const TURSO_CONTROL_DB_URL = process.env.TURSO_CONTROL_DB_URL!;
const TURSO_CONTROL_DB_TOKEN = process.env.TURSO_CONTROL_DB_TOKEN!;
const TURSO_API_TOKEN = process.env.TURSO_API_TOKEN!;
const TURSO_ORG = process.env.TURSO_ORG!;

// Initialize control database
const controlDb = createClient({
  url: TURSO_CONTROL_DB_URL,
  authToken: TURSO_CONTROL_DB_TOKEN,
});
await migrateControl(controlDb);

// Initialize Turso provisioner
const provisioner = new Provisioner(
  controlDb,
  {
    createDatabase: async (name: string) => {
      const res = await fetch(
        `https://api.turso.tech/v1/organizations/${TURSO_ORG}/databases`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${TURSO_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, group: "default" }),
        },
      );
      const data = (await res.json()) as any;
      const dbUrl = `libsql://${data.database.Hostname}`;

      // Create auth token for the new database
      const tokenRes = await fetch(
        `https://api.turso.tech/v1/organizations/${TURSO_ORG}/databases/${name}/auth/tokens`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${TURSO_API_TOKEN}` },
        },
      );
      const tokenData = (await tokenRes.json()) as any;

      return { dbUrl, dbToken: tokenData.jwt };
    },
  },
  (url: string, token?: string) => createClient({ url, authToken: token }),
);

// Initialize OpenAI translator
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const translator = new OpenAITranslator(openai.chat.completions);

// Start server
const server = createServer({
  port: PORT,
  apiKey: API_KEY,
  deepgramApiKey: DEEPGRAM_API_KEY,
  translator,
  getDatabase: (orgType, orgId, stakeId) =>
    provisioner.getDatabase(orgType, orgId, stakeId),
});

console.log(`Recording Angel API running on port ${server.port}`);
```

**Step 5: Run tests to verify they pass**

Run: `bun test test/server.test.ts`
Expected: all 5 tests PASS.

Run all tests: `bun test` from `apps/recording-angel`
Expected: all tests across all files PASS.

**Step 6: Commit**

```
feat(recording-angel): add http and websocket server with session routing
```

---

### Task 13: Integration Test

Full pipeline test: start server, create session via HTTP, connect host + listeners via WebSocket, send audio, verify translated text arrives.

**Files:**

- Create: `apps/recording-angel/test/integration/pipeline.test.ts`

**Step 1: Write integration test**

Create `apps/recording-angel/test/integration/pipeline.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createClient } from "@libsql/client";
import { migrateWard } from "../../src/db/migrations";
import { createServer, type ServerConfig } from "../../src/server";
import { createMockTranslator } from "../helpers/mock-openai";
import {
  startMockDeepgram,
  type MockDeepgramServer,
} from "../helpers/mock-deepgram";

describe("Pipeline Integration", () => {
  let server: ReturnType<typeof createServer>;
  let baseUrl: string;
  let wsUrl: string;
  let mockDeepgram: MockDeepgramServer;

  beforeEach(async () => {
    mockDeepgram = startMockDeepgram();
    const db = createClient({ url: ":memory:" });
    await migrateWard(db);

    server = createServer({
      port: 0,
      apiKey: "test-key",
      deepgramApiKey: "dg-key",
      deepgramUrl: mockDeepgram.url,
      translator: createMockTranslator(),
      getDatabase: async () => db,
    });

    baseUrl = `http://localhost:${server.port}`;
    wsUrl = `ws://localhost:${server.port}/ws`;
  });

  afterEach(() => {
    server.stop(true);
    mockDeepgram.close();
  });

  it("end-to-end: host streams audio, listener receives translated text", async () => {
    // 1. Create session
    const createRes = await fetch(`${baseUrl}/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-key",
      },
      body: JSON.stringify({
        wardId: "ward-1",
        stakeId: "stake-1",
        languages: ["es"],
      }),
    });
    const { joinCode, hostToken } = await createRes.json();

    // 2. Connect host
    const hostMessages: any[] = [];
    const hostWs = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => {
      hostWs.onopen = () => {
        hostWs.send(JSON.stringify({ type: "host:connect", token: hostToken }));
        resolve();
      };
    });

    hostWs.onmessage = (e) => hostMessages.push(JSON.parse(e.data as string));
    await Bun.sleep(100);

    // 3. Connect listener
    const listenerMessages: any[] = [];
    const listenerWs = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => {
      listenerWs.onopen = () => {
        listenerWs.send(
          JSON.stringify({
            type: "listener:connect",
            code: joinCode,
            language: "es",
          }),
        );
        resolve();
      };
    });

    listenerWs.onmessage = (e) =>
      listenerMessages.push(JSON.parse(e.data as string));
    await Bun.sleep(100);

    // 4. Simulate Deepgram returning a transcript
    mockDeepgram.emitTranscript("brothers and sisters", true);
    await Bun.sleep(300);

    // 5. Verify listener received translated text
    const finalTranscript = listenerMessages.find(
      (m) => m.type === "transcript" && m.isFinal && m.language === "es",
    );

    expect(finalTranscript).toBeDefined();
    expect(finalTranscript.text).toBe("[es] brothers and sisters");

    // 6. End session
    hostWs.send(JSON.stringify({ type: "host:disconnect" }));
    await Bun.sleep(100);

    const endMsg = listenerMessages.find((m) => m.type === "session:ended");
    expect(endMsg).toBeDefined();

    hostWs.close();
    listenerWs.close();
  });

  it("multiple listeners with different languages receive correct translations", async () => {
    const createRes = await fetch(`${baseUrl}/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-key",
      },
      body: JSON.stringify({
        wardId: "ward-1",
        stakeId: "stake-1",
        languages: ["es", "pt"],
      }),
    });
    const { joinCode, hostToken } = await createRes.json();

    // Connect host
    const hostWs = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => {
      hostWs.onopen = () => {
        hostWs.send(JSON.stringify({ type: "host:connect", token: hostToken }));
        resolve();
      };
    });
    await Bun.sleep(100);

    // Connect Spanish listener
    const esMessages: any[] = [];
    const esWs = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => {
      esWs.onopen = () => {
        esWs.send(
          JSON.stringify({
            type: "listener:connect",
            code: joinCode,
            language: "es",
          }),
        );
        resolve();
      };
    });
    esWs.onmessage = (e) => esMessages.push(JSON.parse(e.data as string));

    // Connect Portuguese listener
    const ptMessages: any[] = [];
    const ptWs = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => {
      ptWs.onopen = () => {
        ptWs.send(
          JSON.stringify({
            type: "listener:connect",
            code: joinCode,
            language: "pt",
          }),
        );
        resolve();
      };
    });
    ptWs.onmessage = (e) => ptMessages.push(JSON.parse(e.data as string));
    await Bun.sleep(100);

    // Emit transcript
    mockDeepgram.emitTranscript("welcome to sacrament meeting", true);
    await Bun.sleep(300);

    const esFinal = esMessages.find(
      (m) => m.type === "transcript" && m.isFinal && m.language === "es",
    );
    const ptFinal = ptMessages.find(
      (m) => m.type === "transcript" && m.isFinal && m.language === "pt",
    );

    expect(esFinal.text).toBe("[es] welcome to sacrament meeting");
    expect(ptFinal.text).toBe("[pt] welcome to sacrament meeting");

    hostWs.close();
    esWs.close();
    ptWs.close();
  });
});
```

**Step 2: Run integration tests**

Run: `bun test test/integration/pipeline.test.ts`
Expected: all 2 tests PASS.

**Step 3: Run full test suite**

Run: `bun test` from `apps/recording-angel`
Expected: ALL tests PASS across all files.

**Step 4: Commit**

```
test(recording-angel): add end-to-end integration tests for full pipeline
```

---

### Task 14: Final Wiring & Verification

**Files:**

- Verify: all files compile with `tsc --noEmit`
- Verify: full test suite passes
- Verify: `bun run dev` starts the server

**Step 1: Run type checking**

Run: `bun run check-types` from `apps/recording-angel`
Expected: no type errors. Fix any that arise.

**Step 2: Run full test suite**

Run: `bun test` from `apps/recording-angel`
Expected: ALL tests PASS.

**Step 3: Verify dev server starts**

Create a `.env` file (copy from `.env.example` with test values) and run:
`bun run dev` from `apps/recording-angel`
Expected: "Recording Angel API running on port 3001"

**Step 4: Final commit**

```
chore(recording-angel): verify build, types, and full test suite
```
