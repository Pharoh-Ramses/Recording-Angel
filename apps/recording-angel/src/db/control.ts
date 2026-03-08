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
