import { createClient } from "@libsql/client";
import { createServer } from "./server.js";
import { OpenAITranslator } from "./openai-translator.js";
import { Provisioner } from "./db/provisioner.js";
import { migrateControl } from "./db/migrations.js";

const PORT = Number(process.env.PORT) || 3001;
const API_KEY = process.env.API_KEY ?? "";
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY ?? "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const TURSO_CONTROL_URL = process.env.TURSO_CONTROL_URL ?? "";
const TURSO_CONTROL_TOKEN = process.env.TURSO_CONTROL_TOKEN ?? "";
const TURSO_API_TOKEN = process.env.TURSO_API_TOKEN ?? "";
const TURSO_ORG = process.env.TURSO_ORG ?? "";

// OpenAI translator
const openai = {
  chat: {
    completions: {
      create: async (params: {
        model: string;
        messages: Array<{ role: string; content: string }>;
        temperature: number;
        max_tokens: number;
      }) => {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify(params),
        });
        return res.json() as Promise<{
          choices: Array<{ message: { content: string | null } }>;
        }>;
      },
    },
  },
};

const translator = new OpenAITranslator(openai.chat.completions);

// Turso API client
const tursoApi = {
  async createDatabase(name: string) {
    const res = await fetch(
      `https://api.turso.tech/v1/organizations/${TURSO_ORG}/databases`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TURSO_API_TOKEN}`,
        },
        body: JSON.stringify({ name, group: "default" }),
      },
    );
    const data = (await res.json()) as {
      database: { Hostname: string };
    };
    const dbUrl = `libsql://${data.database.Hostname}`;

    // Create auth token for the new DB
    const tokenRes = await fetch(
      `https://api.turso.tech/v1/organizations/${TURSO_ORG}/databases/${name}/auth/tokens`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TURSO_API_TOKEN}`,
        },
      },
    );
    const tokenData = (await tokenRes.json()) as { jwt: string };

    return { dbUrl, dbToken: tokenData.jwt };
  },
};

// Control database + provisioner
const controlDb = createClient({
  url: TURSO_CONTROL_URL,
  authToken: TURSO_CONTROL_TOKEN,
});

async function main() {
  await migrateControl(controlDb);

  const provisioner = new Provisioner(controlDb, tursoApi, (url, token) =>
    createClient({ url, authToken: token }),
  );

  const server = createServer({
    port: PORT,
    apiKey: API_KEY,
    deepgramApiKey: DEEPGRAM_API_KEY,
    translator,
    getDatabase: (orgType, orgId, stakeId) =>
      provisioner.getDatabase(orgType, orgId, stakeId),
  });

  console.log(`Recording Angel API running on port ${server.port}`);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
