export interface Listener {
  id: string;
  language: string;
  send: (data: string) => void;
}

export class ListenerRegistry {
  private listeners = new Map<string, Listener>();
  private _peakCount = 0;

  get count(): number {
    return this.listeners.size;
  }

  get peakCount(): number {
    return this._peakCount;
  }

  get activeLanguages(): string[] {
    const langs = new Set<string>();
    for (const listener of this.listeners.values()) {
      langs.add(listener.language);
    }
    return [...langs];
  }

  add(listener: Listener): void {
    this.listeners.set(listener.id, listener);
    if (this.listeners.size > this._peakCount) {
      this._peakCount = this.listeners.size;
    }
  }

  remove(id: string): void {
    this.listeners.delete(id);
  }

  switchLanguage(id: string, newLanguage: string): void {
    const listener = this.listeners.get(id);
    if (listener) {
      listener.language = newLanguage;
    }
  }

  broadcast(language: string, data: string): void {
    for (const listener of this.listeners.values()) {
      if (listener.language === language) {
        listener.send(data);
      }
    }
  }

  broadcastAll(data: string): void {
    for (const listener of this.listeners.values()) {
      listener.send(data);
    }
  }
}
