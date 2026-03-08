import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
  TranslationQueue,
  type TranslationResult,
} from "../src/translation-queue";
import { createMockTranslator } from "./helpers/mock-openai";

describe("TranslationQueue", () => {
  let queue: TranslationQueue;
  let results: TranslationResult[];

  beforeEach(() => {
    results = [];
    queue = new TranslationQueue({
      translator: createMockTranslator(),
      sourceLang: "en",
      onTranslation: (result) => results.push(result),
    });
  });

  it("translates text to all requested languages in parallel", async () => {
    await queue.translate("hello world", ["es", "pt"]);
    expect(results).toHaveLength(2);
    expect(results.find((r) => r.language === "es")!.text).toBe(
      "[es] hello world",
    );
    expect(results.find((r) => r.language === "pt")!.text).toBe(
      "[pt] hello world",
    );
  });

  it("includes the source text in each result", async () => {
    await queue.translate("hello", ["es"]);
    expect(results[0]!.sourceText).toBe("hello");
  });

  it("does nothing when languages array is empty", async () => {
    await queue.translate("hello", []);
    expect(results).toHaveLength(0);
  });

  it("handles translation errors gracefully", async () => {
    const errors: Error[] = [];
    const failingQueue = new TranslationQueue({
      translator: {
        translate: async () => {
          throw new Error("API down");
        },
      },
      sourceLang: "en",
      onTranslation: (result) => results.push(result),
      onError: (err) => errors.push(err),
    });
    await failingQueue.translate("hello", ["es"]);
    expect(results).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });
});
