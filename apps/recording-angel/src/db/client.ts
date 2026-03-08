import { createClient, type Client } from "@libsql/client";

export function createDb(url: string, authToken?: string): Client {
  return createClient({ url, authToken });
}

export function createMemoryDb(): Client {
  return createClient({ url: ":memory:" });
}
