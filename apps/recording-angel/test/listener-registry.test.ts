import { describe, it, expect, beforeEach, mock } from "bun:test";
import { ListenerRegistry, type Listener } from "../src/listener-registry";

function mockListener(id: string, language: string): Listener {
  return { id, language, send: mock(() => {}) };
}

describe("ListenerRegistry", () => {
  let registry: ListenerRegistry;

  beforeEach(() => {
    registry = new ListenerRegistry();
  });

  describe("add/remove", () => {
    it("adds a listener", () => {
      const listener = mockListener("l1", "es");
      registry.add(listener);
      expect(registry.count).toBe(1);
    });

    it("removes a listener", () => {
      const listener = mockListener("l1", "es");
      registry.add(listener);
      registry.remove("l1");
      expect(registry.count).toBe(0);
    });

    it("ignores removing a nonexistent listener", () => {
      registry.remove("nonexistent");
      expect(registry.count).toBe(0);
    });
  });

  describe("activeLanguages", () => {
    it("returns unique languages of connected listeners", () => {
      registry.add(mockListener("l1", "es"));
      registry.add(mockListener("l2", "es"));
      registry.add(mockListener("l3", "pt"));
      expect(registry.activeLanguages).toEqual(["es", "pt"]);
    });

    it("returns empty array when no listeners", () => {
      expect(registry.activeLanguages).toEqual([]);
    });

    it("updates when listeners disconnect", () => {
      registry.add(mockListener("l1", "es"));
      registry.add(mockListener("l2", "pt"));
      registry.remove("l2");
      expect(registry.activeLanguages).toEqual(["es"]);
    });
  });

  describe("switchLanguage", () => {
    it("moves a listener to a new language group", () => {
      const listener = mockListener("l1", "es");
      registry.add(listener);
      registry.switchLanguage("l1", "pt");
      expect(registry.activeLanguages).toEqual(["pt"]);
    });
  });

  describe("broadcast", () => {
    it("sends to all listeners of a given language", () => {
      const l1 = mockListener("l1", "es");
      const l2 = mockListener("l2", "es");
      const l3 = mockListener("l3", "pt");
      registry.add(l1);
      registry.add(l2);
      registry.add(l3);

      registry.broadcast("es", "hola mundo");
      expect(l1.send).toHaveBeenCalledWith("hola mundo");
      expect(l2.send).toHaveBeenCalledWith("hola mundo");
      expect(l3.send).not.toHaveBeenCalled();
    });

    it("does nothing for a language with no listeners", () => {
      registry.broadcast("zh", "hello");
      // No error thrown
    });
  });

  describe("broadcastAll", () => {
    it("sends to every connected listener regardless of language", () => {
      const l1 = mockListener("l1", "es");
      const l2 = mockListener("l2", "pt");
      registry.add(l1);
      registry.add(l2);

      registry.broadcastAll("session ended");
      expect(l1.send).toHaveBeenCalledWith("session ended");
      expect(l2.send).toHaveBeenCalledWith("session ended");
    });
  });

  describe("peakCount", () => {
    it("tracks the maximum number of concurrent listeners", () => {
      registry.add(mockListener("l1", "es"));
      registry.add(mockListener("l2", "pt"));
      registry.add(mockListener("l3", "es"));
      registry.remove("l3");
      expect(registry.peakCount).toBe(3);
      expect(registry.count).toBe(2);
    });
  });
});
