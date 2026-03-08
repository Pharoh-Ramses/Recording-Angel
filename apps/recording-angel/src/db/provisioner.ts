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
