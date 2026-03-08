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
    port: 0,
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
      },
      close(ws) {
        clients.delete(ws);
      },
    },
  });

  return {
    url: `ws://localhost:${server.port}`,
    port: server.port as number,
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
