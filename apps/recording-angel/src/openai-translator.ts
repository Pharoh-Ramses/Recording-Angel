import type { Translator } from "./translation-queue.js";

interface ChatCompletionsAPI {
  create(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature: number;
    max_tokens: number;
  }): Promise<{
    choices: Array<{ message: { content: string | null } }>;
  }>;
}

export class OpenAITranslator implements Translator {
  constructor(private completions: ChatCompletionsAPI) {}

  async translate(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<string> {
    const response = await this.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a translator. Translate the following text from ${sourceLang} to ${targetLang}. Return ONLY the translation, nothing else. Preserve formatting and punctuation.`,
        },
        { role: "user", content: text },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No translation content in OpenAI response");
    return content.trim();
  }
}
