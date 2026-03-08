import type { Client } from "@libsql/client";
import { DeepgramStream, type TranscriptEvent } from "./deepgram-stream.js";
import { TranslationQueue, type Translator } from "./translation-queue.js";
import { TranscriptStore } from "./transcript-store.js";
import { ListenerRegistry } from "./listener-registry.js";
import { SessionAlreadyHostedError, SessionEndedError } from "./errors.js";

export interface SessionConfig {
  id: string;
  joinCode: string;
  hostToken: string;
  sourceLang: string;
  targetLangs: string[];
}

export interface SessionDeps {
  db: Client;
  deepgramApiKey: string;
  deepgramUrl?: string;
  translator: Translator;
}

interface WsLike {
  send(data: string): void;
  close(): void;
}

type SessionStatus = "waiting" | "live" | "ended";

export class Session {
  private _status: SessionStatus = "waiting";
  private hostWs: WsLike | null = null;
  private deepgram: DeepgramStream | null = null;
  private translationQueue: TranslationQueue;
  private transcriptStore: TranscriptStore;
  private listeners: ListenerRegistry;
  private config: SessionConfig;

  constructor(
    config: SessionConfig,
    private deps: SessionDeps,
  ) {
    this.config = config;
    this.listeners = new ListenerRegistry();
    this.transcriptStore = new TranscriptStore(config.id, deps.db);

    this.translationQueue = new TranslationQueue({
      translator: deps.translator,
      sourceLang: config.sourceLang,
      onTranslation: (result) => {
        const message = JSON.stringify({
          type: "transcript",
          text: result.text,
          language: result.language,
          isFinal: true,
        });
        this.listeners.broadcast(result.language, message);
        this.transcriptStore.append({
          sourceText: result.sourceText,
          language: result.language,
          text: result.text,
          isFinal: true,
        });
      },
      onError: (err) => console.error("Translation error:", err),
    });
  }

  get status(): SessionStatus {
    return this._status;
  }
  get listenerCount(): number {
    return this.listeners.count;
  }
  get joinCode(): string {
    return this.config.joinCode;
  }
  get hostToken(): string {
    return this.config.hostToken;
  }

  async addHost(ws: WsLike): Promise<void> {
    if (this._status === "ended") throw new SessionEndedError();
    if (this.hostWs) throw new SessionAlreadyHostedError();

    this.hostWs = ws;
    this.deepgram = new DeepgramStream({
      url: this.deps.deepgramUrl,
      apiKey: this.deps.deepgramApiKey,
      language: this.config.sourceLang,
      onTranscript: (event) => this.handleTranscript(event),
      onError: (err) => console.error("Deepgram error:", err),
    });
    await this.deepgram.connect();
    this._status = "live";
  }

  addListener(id: string, ws: WsLike, language: string): void {
    this.listeners.add({ id, language, send: (data) => ws.send(data) });
  }

  removeListener(id: string): void {
    this.listeners.remove(id);
  }

  switchListenerLanguage(id: string, language: string): void {
    this.listeners.switchLanguage(id, language);
  }

  onAudio(data: ArrayBuffer): void {
    this.deepgram?.sendAudio(data);
  }

  async end(): Promise<void> {
    if (this._status === "ended") return;
    this._status = "ended";
    this.deepgram?.close();
    this.deepgram = null;
    const endMessage = JSON.stringify({ type: "session:ended" });
    this.listeners.broadcastAll(endMessage);
    this.hostWs?.close();
    this.hostWs = null;
    await this.transcriptStore.flush();
  }

  private handleTranscript(event: TranscriptEvent): void {
    if (event.isFinal) {
      this.transcriptStore.append({
        sourceText: event.text,
        language: "source",
        text: event.text,
        isFinal: true,
      });
      const languages = this.listeners.activeLanguages;
      this.translationQueue.translate(event.text, languages);
    }
    const interimMessage = JSON.stringify({
      type: "transcript",
      text: event.text,
      language: this.config.sourceLang,
      isFinal: event.isFinal,
    });
    this.listeners.broadcastAll(interimMessage);
  }
}
