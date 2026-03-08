import { describe, it, expect, beforeEach } from "bun:test";
import { createClient, type Client } from "@libsql/client";
import { migrateControl } from "../../src/db/migrations.js";
import {
  registerOrganization,
  findOrganization,
  type OrganizationRecord,
} from "../../src/db/control.js";

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
