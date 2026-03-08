import { describe, it, expect, beforeEach, mock } from "bun:test";
import { createClient, type Client } from "@libsql/client";
import { migrateControl } from "../../src/db/migrations.js";
import { Provisioner, type TursoApiClient } from "../../src/db/provisioner.js";

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
