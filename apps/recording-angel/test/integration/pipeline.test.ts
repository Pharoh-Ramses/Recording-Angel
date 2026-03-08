import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createClient } from "@libsql/client";
import { migrateWard } from "../../src/db/migrations.js";
import { createServer, type ServerConfig } from "../../src/server.js";
import { createMockTranslator } from "../helpers/mock-openai.js";
import {
  startMockDeepgram,
  type MockDeepgramServer,
} from "../helpers/mock-deepgram.js";

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
