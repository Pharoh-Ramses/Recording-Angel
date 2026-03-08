export interface Translator {
  translate(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<string>;
}

export interface TranslationResult {
  sourceText: string;
  language: string;
  text: string;
}

export interface TranslationQueueConfig {
  translator: Translator;
  sourceLang: string;
  onTranslation: (result: TranslationResult) => void;
  onError?: (error: Error) => void;
}

export class TranslationQueue {
  private config: TranslationQueueConfig;

  constructor(config: TranslationQueueConfig) {
    this.config = config;
  }

  async translate(text: string, targetLanguages: string[]): Promise<void> {
    if (targetLanguages.length === 0) return;

    const tasks = targetLanguages.map(async (lang) => {
      try {
        const translated = await this.config.translator.translate(
          text,
          this.config.sourceLang,
          lang,
        );
        this.config.onTranslation({
          sourceText: text,
          language: lang,
          text: translated,
        });
      } catch (err) {
        this.config.onError?.(
          err instanceof Error ? err : new Error(String(err)),
        );
      }
    });

    await Promise.all(tasks);
  }
}
