import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  startMockDeepgram,
  type MockDeepgramServer,
} from "./helpers/mock-deepgram.js";
import {
  DeepgramStream,
  type TranscriptEvent,
} from "../src/deepgram-stream.js";

describe("DeepgramStream", () => {
  let mockServer: MockDeepgramServer;

  beforeEach(() => {
    mockServer = startMockDeepgram();
  });

  afterEach(() => {
    mockServer.close();
  });

  it("emits transcript events for final results", async () => {
    const events: TranscriptEvent[] = [];
    const stream = new DeepgramStream({
      url: mockServer.url,
      apiKey: "test-key",
      language: "en",
      onTranscript: (event: TranscriptEvent) => events.push(event),
      onError: () => {},
    });

    await stream.connect();

    mockServer.emitTranscript("hello world", true);
    await Bun.sleep(50);

    expect(events).toHaveLength(1);
    expect(events[0]!.text).toBe("hello world");
    expect(events[0]!.isFinal).toBe(true);

    stream.close();
  });

  it("emits transcript events for interim results", async () => {
    const events: TranscriptEvent[] = [];
    const stream = new DeepgramStream({
      url: mockServer.url,
      apiKey: "test-key",
      language: "en",
      onTranscript: (event: TranscriptEvent) => events.push(event),
      onError: () => {},
    });

    await stream.connect();

    mockServer.emitTranscript("hel", false);
    await Bun.sleep(50);

    expect(events).toHaveLength(1);
    expect(events[0]!.isFinal).toBe(false);

    stream.close();
  });

  it("ignores empty transcripts", async () => {
    const events: TranscriptEvent[] = [];
    const stream = new DeepgramStream({
      url: mockServer.url,
      apiKey: "test-key",
      language: "en",
      onTranscript: (event: TranscriptEvent) => events.push(event),
      onError: () => {},
    });

    await stream.connect();

    mockServer.emitTranscript("", true);
    await Bun.sleep(50);

    expect(events).toHaveLength(0);

    stream.close();
  });

  it("forwards audio data to the server", async () => {
    const stream = new DeepgramStream({
      url: mockServer.url,
      apiKey: "test-key",
      language: "en",
      onTranscript: () => {},
      onError: () => {},
    });

    await stream.connect();

    const audio = new Uint8Array([1, 2, 3, 4]);
    stream.sendAudio(audio.buffer);

    stream.close();
  });
});
