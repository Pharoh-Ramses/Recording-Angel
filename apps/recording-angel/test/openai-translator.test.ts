import { describe, it, expect, mock } from "bun:test";
import { OpenAITranslator } from "../src/openai-translator";

describe("OpenAITranslator", () => {
  it("calls openai with the correct prompt structure", async () => {
    const mockCreate = mock(async () => ({
      choices: [{ message: { content: "hola mundo" } }],
    }));

    const translator = new OpenAITranslator({ create: mockCreate as any });

    const result = await translator.translate("hello world", "en", "es");

    expect(result).toBe("hola mundo");
    expect(mockCreate).toHaveBeenCalledTimes(1);

    const callArgs = mockCreate.mock.calls[0]![0] as any;
    expect(callArgs.model).toBe("gpt-4o-mini");
    expect(callArgs.messages).toHaveLength(2);
    expect(callArgs.messages[1].content).toContain("hello world");
  });

  it("trims whitespace from response", async () => {
    const translator = new OpenAITranslator({
      create: mock(async () => ({
        choices: [{ message: { content: "  hola mundo  \n" } }],
      })) as any,
    });
    const result = await translator.translate("hello world", "en", "es");
    expect(result).toBe("hola mundo");
  });

  it("throws when response has no content", async () => {
    const translator = new OpenAITranslator({
      create: mock(async () => ({
        choices: [{ message: { content: null } }],
      })) as any,
    });
    expect(translator.translate("hello", "en", "es")).rejects.toThrow();
  });
});
