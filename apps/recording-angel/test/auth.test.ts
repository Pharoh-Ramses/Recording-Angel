import { describe, it, expect } from "bun:test";
import {
  generateJoinCode,
  generateHostToken,
  validateApiKey,
} from "../src/auth";

describe("generateJoinCode", () => {
  it("returns a 6-character string", () => {
    const code = generateJoinCode();
    expect(code).toHaveLength(6);
  });

  it("only contains unambiguous characters (no 0, O, 1, I)", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateJoinCode();
      expect(code).not.toMatch(/[0O1I]/);
    }
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateJoinCode()));
    expect(codes.size).toBe(50);
  });
});

describe("generateHostToken", () => {
  it("returns a valid UUID", () => {
    const token = generateHostToken();
    expect(token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("generates unique tokens", () => {
    const a = generateHostToken();
    const b = generateHostToken();
    expect(a).not.toBe(b);
  });
});

describe("validateApiKey", () => {
  const expected = "sk-test-key-12345";

  it("returns true for matching key", () => {
    expect(validateApiKey("sk-test-key-12345", expected)).toBe(true);
  });

  it("returns false for wrong key", () => {
    expect(validateApiKey("sk-wrong-key", expected)).toBe(false);
  });

  it("returns false for null", () => {
    expect(validateApiKey(null, expected)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(validateApiKey("", expected)).toBe(false);
  });
});
