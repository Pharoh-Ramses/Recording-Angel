import type { Client } from "@libsql/client";
import type { Translator } from "./translation-queue.js";
import type { ServerWebSocket } from "bun";
import { Session, type SessionConfig, type SessionDeps } from "./session.js";
import { generateJoinCode, generateHostToken, validateApiKey } from "./auth.js";

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

interface SessionEntry {
  session: Session;
  sessionId: string;
  joinCode: string;
  hostToken: string;
  languages: string[];
}

interface WsData {
  sessionId?: string;
  role?: "host" | "listener";
  listenerId?: string;
}

export function createServer(config: ServerConfig) {
  const sessions = new Map<string, SessionEntry>();
  const joinCodeToSessionId = new Map<string, string>();
  const hostTokenToSessionId = new Map<string, string>();

  async function handlePost(req: Request): Promise<Response> {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!validateApiKey(token, config.apiKey)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { wardId, stakeId, languages } = body as {
      wardId: string;
      stakeId: string;
      languages: string[];
    };

    const sessionId = crypto.randomUUID();
    const joinCode = generateJoinCode();
    const hostToken = generateHostToken();

    const db = await config.getDatabase("ward", wardId, stakeId);

    const sessionConfig: SessionConfig = {
      id: sessionId,
      joinCode,
      hostToken,
      sourceLang: "en",
      targetLangs: languages,
    };

    const sessionDeps: SessionDeps = {
      db,
      deepgramApiKey: config.deepgramApiKey,
      deepgramUrl: config.deepgramUrl,
      translator: config.translator,
    };

    const session = new Session(sessionConfig, sessionDeps);

    // Insert session row so FK constraints on transcript_segments are satisfied
    await db.execute({
      sql: "INSERT INTO sessions (id, join_code, host_token, source_lang, target_langs, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [
        sessionId,
        joinCode,
        hostToken,
        "en",
        JSON.stringify(languages),
        "waiting",
        new Date().toISOString(),
      ],
    });

    const entry: SessionEntry = {
      session,
      sessionId,
      joinCode,
      hostToken,
      languages,
    };

    sessions.set(sessionId, entry);
    joinCodeToSessionId.set(joinCode, sessionId);
    hostTokenToSessionId.set(hostToken, sessionId);

    return Response.json({ sessionId, joinCode, hostToken }, { status: 201 });
  }

  function handleGetSession(code: string): Response {
    const sessionId = joinCodeToSessionId.get(code);
    if (!sessionId) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const entry = sessions.get(sessionId);
    if (!entry) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json({
      sessionId: entry.sessionId,
      languages: entry.languages,
    });
  }

  const server = Bun.serve<WsData>({
    port: config.port,

    async fetch(req, server) {
      const url = new URL(req.url);

      // WebSocket upgrade
      if (url.pathname === "/ws") {
        const upgraded = server.upgrade(req, { data: {} });
        if (upgraded) return undefined as unknown as Response;
        return new Response("WebSocket upgrade failed", { status: 400 });
      }

      // POST /sessions
      if (req.method === "POST" && url.pathname === "/sessions") {
        return handlePost(req);
      }

      // GET /sessions/:code
      const sessionMatch = url.pathname.match(/^\/sessions\/([A-Za-z0-9]+)$/);
      if (req.method === "GET" && sessionMatch) {
        return handleGetSession(sessionMatch[1]!);
      }

      return new Response("Not found", { status: 404 });
    },

    websocket: {
      async message(ws, message) {
        const data = ws.data as WsData;

        // If not yet associated with a session, expect a connect message
        if (!data.role) {
          try {
            const msg = JSON.parse(
              typeof message === "string"
                ? message
                : new TextDecoder().decode(message as BufferSource),
            );

            if (msg.type === "host:connect") {
              const sessionId = hostTokenToSessionId.get(msg.token);
              if (!sessionId) {
                ws.send(
                  JSON.stringify({ type: "error", message: "Invalid token" }),
                );
                ws.close();
                return;
              }
              const entry = sessions.get(sessionId);
              if (!entry) {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    message: "Session not found",
                  }),
                );
                ws.close();
                return;
              }
              data.role = "host";
              data.sessionId = sessionId;
              await entry.session.addHost(ws);
              ws.send(JSON.stringify({ type: "host:connected" }));
              return;
            }

            if (msg.type === "listener:connect") {
              const sessionId = joinCodeToSessionId.get(msg.code);
              if (!sessionId) {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    message: "Session not found",
                  }),
                );
                ws.close();
                return;
              }
              const entry = sessions.get(sessionId);
              if (!entry) {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    message: "Session not found",
                  }),
                );
                ws.close();
                return;
              }
              const listenerId = crypto.randomUUID();
              data.role = "listener";
              data.sessionId = sessionId;
              data.listenerId = listenerId;
              entry.session.addListener(listenerId, ws, msg.language);
              ws.send(
                JSON.stringify({
                  type: "listener:connected",
                  listenerId,
                }),
              );
              return;
            }
          } catch {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Invalid message format",
              }),
            );
            return;
          }
          return;
        }

        // Already associated — handle role-specific messages
        if (data.role === "host" && data.sessionId) {
          const entry = sessions.get(data.sessionId);
          if (!entry) return;

          // Binary audio data
          if (message instanceof ArrayBuffer) {
            entry.session.onAudio(message);
            return;
          }

          // JSON message
          try {
            const msg = JSON.parse(message as string);
            if (msg.type === "host:disconnect") {
              await entry.session.end();
              return;
            }
          } catch {
            // Ignore invalid JSON from host
          }
          return;
        }

        if (data.role === "listener" && data.sessionId && data.listenerId) {
          const entry = sessions.get(data.sessionId);
          if (!entry) return;

          try {
            const msg = JSON.parse(
              typeof message === "string"
                ? message
                : new TextDecoder().decode(message as BufferSource),
            );
            if (msg.type === "listener:language") {
              entry.session.switchListenerLanguage(
                data.listenerId,
                msg.language,
              );
              return;
            }
          } catch {
            // Ignore invalid JSON from listener
          }
          return;
        }
      },

      close(ws) {
        const data = ws.data as WsData;
        if (data.role === "listener" && data.sessionId && data.listenerId) {
          const entry = sessions.get(data.sessionId);
          if (entry) {
            entry.session.removeListener(data.listenerId);
          }
        }
      },

      open(_ws) {
        // No-op — wait for first message to determine role
      },
    },
  });

  return server;
}
