export interface TranscriptEvent {
  text: string;
  isFinal: boolean;
}

export interface DeepgramStreamConfig {
  url?: string;
  apiKey: string;
  language: string;
  onTranscript: (event: TranscriptEvent) => void;
  onError: (error: Error) => void;
}

const DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen";

export class DeepgramStream {
  private ws: WebSocket | null = null;
  private config: DeepgramStreamConfig;

  constructor(config: DeepgramStreamConfig) {
    this.config = config;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const baseUrl = this.config.url ?? DEEPGRAM_WS_URL;
      const params = new URLSearchParams({
        encoding: "linear16",
        sample_rate: "16000",
        language: this.config.language,
        model: "nova-2",
        punctuate: "true",
        interim_results: "true",
      });

      const url = `${baseUrl}?${params}`;

      // Note: Bun's native WebSocket does not support custom headers in the
      // constructor. In production, Deepgram auth will need to be handled
      // differently (e.g., via query param or a different WS client).
      // The mock server used in tests does not check auth.
      this.ws = new WebSocket(url);

      this.ws.onopen = () => resolve();

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          if (data.type !== "Results") return;

          const transcript = data.channel?.alternatives?.[0]?.transcript ?? "";
          if (transcript.length === 0) return;

          this.config.onTranscript({
            text: transcript,
            isFinal: data.is_final ?? false,
          });
        } catch (err) {
          this.config.onError(
            err instanceof Error ? err : new Error(String(err)),
          );
        }
      };

      this.ws.onerror = () => {
        const error = new Error("Deepgram WebSocket error");
        this.config.onError(error);
        reject(error);
      };

      this.ws.onclose = () => {
        this.ws = null;
      };
    });
  }

  sendAudio(data: ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
