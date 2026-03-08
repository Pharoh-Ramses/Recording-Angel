import type { Translator } from "../../src/translation-queue";

export function createMockTranslator(): Translator {
  return {
    translate: async (
      text: string,
      _sourceLang: string,
      targetLang: string,
    ) => {
      return `[${targetLang}] ${text}`;
    },
  };
}
