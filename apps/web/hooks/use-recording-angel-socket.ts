"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SocketStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface TranscriptMessage {
  type: "transcript";
  text: string;
  language: string;
  isFinal: boolean;
}

export interface SessionEndedMessage {
  type: "session:ended";
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

type ServerMessage = TranscriptMessage | SessionEndedMessage | ErrorMessage;

interface UseRecordingAngelSocketOptions {
  url: string;
  onTranscript?: (msg: TranscriptMessage) => void;
  onSessionEnded?: () => void;
  onError?: (msg: ErrorMessage) => void;
}

export function useRecordingAngelSocket(
  options: UseRecordingAngelSocketOptions,
) {
  const [status, setStatus] = useState<SocketStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const maxRetries = 3;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    const ws = new WebSocket(options.url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      retriesRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        switch (msg.type) {
          case "transcript":
            optionsRef.current.onTranscript?.(msg as TranscriptMessage);
            break;
          case "session:ended":
            optionsRef.current.onSessionEnded?.();
            break;
          case "error":
            optionsRef.current.onError?.(msg as ErrorMessage);
            break;
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (retriesRef.current < maxRetries) {
        retriesRef.current++;
        const delay = Math.min(1000 * 2 ** retriesRef.current, 8000);
        setStatus("connecting");
        setTimeout(() => connect(), delay);
      } else {
        setStatus("error");
      }
    };

    ws.onerror = () => {
      // onclose will fire after this
    };
  }, [options.url]);

  const disconnect = useCallback(() => {
    retriesRef.current = maxRetries; // Prevent reconnection
    wsRef.current?.close();
    wsRef.current = null;
    setStatus("disconnected");
  }, []);

  const send = useCallback((data: string | ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  useEffect(() => {
    return () => {
      retriesRef.current = maxRetries;
      wsRef.current?.close();
    };
  }, []);

  return { status, connect, disconnect, send };
}
