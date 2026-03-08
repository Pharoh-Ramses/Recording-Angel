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

      this.ws = new WebSocket(url, {
        headers: { Authorization: `Token ${this.config.apiKey}` },
      } as unknown as string[]);

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

      this.ws.onerror = (event) => {
        const error = new Error(
          `Deepgram WebSocket error: ${(event as ErrorEvent).message ?? "unknown"}`,
        );
        this.config.onError(error);
        reject(error);
      };

      this.ws.onclose = (event) => {
        if (event.code !== 1000) {
          console.error(
            `Deepgram WS closed: code=${event.code} reason=${event.reason || "(none)"}`,
          );
        }
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
