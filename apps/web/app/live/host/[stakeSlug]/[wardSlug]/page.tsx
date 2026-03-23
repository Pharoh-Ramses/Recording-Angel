"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { createLiveSession } from "@/app/actions/live-session";
import { useRecordingAngelSocket } from "@/hooks/use-recording-angel-socket";
import { useAudioCapture } from "@/hooks/use-audio-capture";
import { AnimatedSegment } from "@/components/live/animated-segment";
import { LiveIndicator } from "@/components/live/live-indicator";
import { Waveform } from "@/components/live/waveform";
import { toast } from "sonner";
import type { TranscriptMessage } from "@/hooks/use-recording-angel-socket";

interface Segment {
  id: number;
  text: string;
  language: string;
  isFinal: boolean;
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
  zh: "中文",
  ko: "한국어",
  ja: "日本語",
  tl: "Tagalog",
  to: "Lea fakatonga",
  sm: "Gagana Samoa",
};

type SessionState =
  | { phase: "idle" }
  | {
      phase: "created";
      sessionId: string;
      joinCode: string;
      hostToken: string;
    }
  | { phase: "live"; sessionId: string; joinCode: string; hostToken: string }
  | { phase: "ended" };

export default function LiveDashboardPage() {
  const params = useParams<{ stakeSlug: string; wardSlug: string }>();
  const stake = useQuery(api.stakes.getBySlug, { slug: params.stakeSlug });
  const ward = useQuery(
    api.wards.getBySlug,
    stake ? { slug: params.wardSlug, stakeId: stake._id } : "skip",
  );
  const permissions = useQuery(api.roles.myPermissions, {
    wardId: ward?._id,
  });

  const [sessionState, setSessionState] = useState<SessionState>({
    phase: "idle",
  });
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Transcript monitor state
  const [segmentsByLang, setSegmentsByLang] = useState<
    Record<string, Segment[]>
  >({});
  const [previewLang, setPreviewLang] = useState<string | null>(null);
  const segmentCounter = useRef(0);
  const sourceScrollRef = useRef<HTMLDivElement>(null);
  const translationScrollRef = useRef<HTMLDivElement>(null);

  // Source language is always "en" (the speaker's language)
  const sourceLang = "en";
  const stakeLanguages = stake?.languages;
  // Translation languages = stake languages minus the source
  const translationLanguages = useMemo(
    () => (stakeLanguages ?? []).filter((l) => l !== sourceLang),
    [stakeLanguages],
  );

  // Default preview language to the first translation language
  useEffect(() => {
    if (!previewLang && translationLanguages.length > 0) {
      setPreviewLang(translationLanguages[0]!);
    }
  }, [previewLang, translationLanguages]);

  const canManage = permissions?.includes("live:manage") ?? false;

  // Timer for live sessions
  useEffect(() => {
    if (sessionState.phase === "live") {
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionState.phase]);

  // Transcript handler — stores segments per language
  const handleTranscript = useCallback((msg: TranscriptMessage) => {
    const lang = msg.language;
    setSegmentsByLang((prev) => {
      const langSegments = prev[lang] ?? [];
      const lastIdx = langSegments.length - 1;

      if (!msg.isFinal) {
        // Replace the last interim, or add a new one
        if (lastIdx >= 0 && !langSegments[lastIdx]!.isFinal) {
          const updated = [...langSegments];
          updated[lastIdx] = { ...updated[lastIdx]!, text: msg.text };
          return { ...prev, [lang]: updated };
        }
        segmentCounter.current++;
        return {
          ...prev,
          [lang]: [
            ...langSegments,
            {
              id: segmentCounter.current,
              text: msg.text,
              language: lang,
              isFinal: false,
            },
          ],
        };
      }

      // Final — replace last interim or append
      if (lastIdx >= 0 && !langSegments[lastIdx]!.isFinal) {
        const updated = [...langSegments];
        updated[lastIdx] = {
          ...updated[lastIdx]!,
          text: msg.text,
          language: lang,
          isFinal: true,
        };
        return { ...prev, [lang]: updated };
      }

      segmentCounter.current++;
      return {
        ...prev,
        [lang]: [
          ...langSegments,
          {
            id: segmentCounter.current,
            text: msg.text,
            language: lang,
            isFinal: true,
          },
        ],
      };
    });
  }, []);

  // Auto-scroll both transcript panels to latest content
  useEffect(() => {
    sourceScrollRef.current?.scrollTo({
      top: sourceScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
    translationScrollRef.current?.scrollTo({
      top: translationScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [segmentsByLang]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // WebSocket
  const apiUrl = process.env.NEXT_PUBLIC_RECORDING_ANGEL_URL ?? "";
  const wsUrl = apiUrl.replace(/^http/, "ws") + "/ws";

  const {
    status: socketStatus,
    connect,
    disconnect,
    send,
  } = useRecordingAngelSocket({
    url: wsUrl,
    onTranscript: handleTranscript,
    onSessionEnded: () => setSessionState({ phase: "ended" }),
    onError: (msg) => toast.error(msg.message),
  });

  // Audio capture
  const {
    micStatus,
    start: startMic,
    stop: stopMic,
  } = useAudioCapture({
    onAudioChunk: (chunk) => send(chunk),
  });

  // Use a ref + useEffect pattern for sending host:connect after WebSocket opens
  const pendingHostConnectRef = useRef<string | null>(null);

  useEffect(() => {
    if (socketStatus === "connected" && pendingHostConnectRef.current) {
      send(
        JSON.stringify({
          type: "host:connect",
          token: pendingHostConnectRef.current,
        }),
      );
      pendingHostConnectRef.current = null;
    }
  }, [socketStatus, send]);

  const handleCreateSession = useCallback(async () => {
    if (!ward || !stake) return;
    setCreating(true);
    try {
      const result = await createLiveSession(ward._id, stake._id);
      setSessionState({
        phase: "created",
        ...result,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create session",
      );
    } finally {
      setCreating(false);
    }
  }, [ward, stake]);

  const handleGoLive = useCallback(async () => {
    if (sessionState.phase !== "created") return;
    pendingHostConnectRef.current = sessionState.hostToken;
    connect();
    await startMic();
    setSessionState({ ...sessionState, phase: "live" });
  }, [sessionState, connect, startMic]);

  const handleEndSession = useCallback(() => {
    send(JSON.stringify({ type: "host:disconnect" }));
    stopMic();
    disconnect();
    setSessionState({ phase: "ended" });
  }, [send, stopMic, disconnect]);

  const handleCopyCode = useCallback(async () => {
    if (sessionState.phase !== "created" && sessionState.phase !== "live")
      return;
    const joinUrl = `${window.location.origin}/live/join?code=${sessionState.joinCode}`;
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    toast.success("Join link copied!");
    setTimeout(() => setCopied(false), 2000);
  }, [sessionState]);

  if (!canManage) {
    return (
      <div
        className="flex items-center justify-center h-64"
        style={{ backgroundColor: "var(--tp-bg-primary)" }}
      >
        <p className="text-[var(--tp-text-secondary)]">
          You don&apos;t have permission to manage live sessions.
        </p>
      </div>
    );
  }

  // Idle state
  if (sessionState.phase === "idle") {
    return (
      <div
        className="flex flex-col items-center justify-center h-64 gap-4"
        style={{ backgroundColor: "var(--tp-bg-primary)" }}
      >
        <svg
          className="h-12 w-12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--tp-text-secondary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
          <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4" />
          <circle cx="12" cy="12" r="2" />
          <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4" />
          <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
        </svg>
        <h2 className="text-xl font-semibold text-[var(--tp-text-primary)]">
          Live Visit
        </h2>
        <p className="text-sm text-[var(--tp-text-secondary)] text-center max-w-sm">
          Start a live session to broadcast real-time translated text to
          listeners.
        </p>
        <button
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          style={{ backgroundColor: "var(--tp-accent-green)", color: "#fff" }}
          onClick={handleCreateSession}
          disabled={creating}
        >
          {creating ? "Creating..." : "Start Session"}
        </button>
      </div>
    );
  }

  // Created state — show join code, wait for Go Live
  if (sessionState.phase === "created") {
    return (
      <div
        className="flex flex-col items-center justify-center h-64 gap-6"
        style={{ backgroundColor: "var(--tp-bg-primary)" }}
      >
        <div className="text-center">
          <p className="text-sm text-[var(--tp-text-secondary)] mb-2">
            Join Code
          </p>
          <p
            className="text-5xl font-bold tracking-[0.3em]"
            style={{
              fontFamily: "var(--font-jetbrains)",
              color: "var(--tp-text-primary)",
            }}
          >
            {sessionState.joinCode}
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          style={{
            backgroundColor: "var(--tp-glass-bg)",
            border: "1px solid var(--tp-glass-border)",
            color: "var(--tp-text-primary)",
          }}
          onClick={handleCopyCode}
        >
          {copied ? (
            <svg
              className="h-4 w-4"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 8 6.5 11.5 13 5" />
            </svg>
          ) : (
            <svg
              className="h-4 w-4"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="5" y="5" width="9" height="9" rx="1.5" />
              <path d="M5 11H3.5A1.5 1.5 0 012 9.5v-7A1.5 1.5 0 013.5 1h7A1.5 1.5 0 0112 2.5V5" />
            </svg>
          )}
          {copied ? "Copied!" : "Copy Join Link"}
        </button>
        <button
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-base font-semibold cursor-pointer"
          style={{ backgroundColor: "var(--tp-accent-green)", color: "#fff" }}
          onClick={handleGoLive}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1a4 4 0 00-4 4v6a4 4 0 008 0V5a4 4 0 00-4-4z" />
            <path
              d="M19 11a7 7 0 01-14 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="12"
              y1="19"
              x2="12"
              y2="23"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="8"
              y1="23"
              x2="16"
              y2="23"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Go Live
        </button>
      </div>
    );
  }

  // Live state
  if (sessionState.phase === "live") {
    const sourceSegments = segmentsByLang[sourceLang] ?? [];
    const previewSegments = previewLang
      ? (segmentsByLang[previewLang] ?? [])
      : [];

    return (
      <div
        className="flex flex-col h-dvh"
        style={{ backgroundColor: "var(--tp-bg-primary)" }}
      >
        {/* ===== TOP BAR (56px) ===== */}
        <div
          className="shrink-0 h-14 flex items-center justify-between px-6"
          style={{
            backgroundColor: "var(--tp-bg-secondary)",
            borderBottom: "1px solid var(--tp-glass-border)",
          }}
        >
          {/* Left: LIVE badge + Join code + Copy */}
          <div className="flex items-center gap-5">
            <LiveIndicator status="live" />
            <div
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-md"
              style={{
                backgroundColor: "var(--tp-glass-bg)",
                border: "1px solid var(--tp-glass-border)",
              }}
            >
              <span
                className="text-[0.8rem] font-medium tracking-[0.15em] text-[var(--tp-text-primary)]"
                style={{ fontFamily: "var(--font-jetbrains)" }}
              >
                {sessionState.joinCode}
              </span>
              <button
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[0.65rem] font-medium cursor-pointer transition-colors"
                style={{
                  border: "1px solid var(--tp-glass-border)",
                  color: "var(--tp-text-secondary)",
                }}
                onClick={handleCopyCode}
              >
                {copied ? (
                  <svg
                    className="w-3 h-3"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 8 6.5 11.5 13 5" />
                  </svg>
                ) : (
                  <svg
                    className="w-3 h-3"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="5" y="5" width="9" height="9" rx="1.5" />
                    <path d="M5 11H3.5A1.5 1.5 0 012 9.5v-7A1.5 1.5 0 013.5 1h7A1.5 1.5 0 0112 2.5V5" />
                  </svg>
                )}
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>

          {/* Right: Listener count + Language dropdown */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[0.75rem] font-medium text-[var(--tp-text-secondary)]">
              <svg
                className="w-3.5 h-3.5 opacity-60"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0H3z" />
              </svg>
              0 listeners
            </div>
            {translationLanguages.length > 0 && (
              <select
                value={previewLang ?? ""}
                onChange={(e) => setPreviewLang(e.target.value)}
                className="appearance-none rounded-md px-2.5 py-1.5 text-[0.75rem] font-medium outline-none cursor-pointer"
                style={{
                  backgroundColor: "var(--tp-glass-bg)",
                  border: "1px solid var(--tp-glass-border)",
                  color: "var(--tp-text-primary)",
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                {translationLanguages.map((lang) => (
                  <option
                    key={lang}
                    value={lang}
                    style={{ background: "var(--tp-bg-panel)" }}
                  >
                    {LANGUAGE_LABELS[lang] ?? lang}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* ===== SPLIT COLUMNS ===== */}
        <div
          className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-0"
          style={{ gap: "1px", backgroundColor: "var(--tp-glass-border)" }}
        >
          {/* Source column */}
          <div
            className="flex flex-col overflow-hidden"
            style={{ backgroundColor: "var(--tp-bg-primary)" }}
          >
            <div
              className="shrink-0 px-6 py-3 text-[0.65rem] font-semibold tracking-[0.14em] uppercase text-[var(--tp-text-secondary)]"
              style={{
                backgroundColor: "var(--tp-bg-secondary)",
                borderBottom: "1px solid var(--tp-glass-border)",
              }}
            >
              {LANGUAGE_LABELS[sourceLang] ?? sourceLang} (Source)
            </div>
            <div
              ref={sourceScrollRef}
              className="flex-1 overflow-y-auto p-6 scroll-smooth"
            >
              <div className="flex flex-col gap-5">
                {sourceSegments.length === 0 && (
                  <p className="text-sm text-[var(--tp-text-secondary)]">
                    Waiting for speech...
                  </p>
                )}
                {sourceSegments.map((seg, i) => (
                  <AnimatedSegment
                    key={seg.id}
                    text={seg.text}
                    isFinal={seg.isFinal}
                    isDimmed={i < sourceSegments.length - 5}
                    className="text-[1.15rem]"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Translation preview column */}
          {previewLang && (
            <div
              className="flex flex-col overflow-hidden"
              style={{ backgroundColor: "var(--tp-bg-primary)" }}
            >
              <div
                className="shrink-0 px-6 py-3 text-[0.65rem] font-semibold tracking-[0.14em] uppercase text-[var(--tp-text-secondary)]"
                style={{
                  backgroundColor: "var(--tp-bg-secondary)",
                  borderBottom: "1px solid var(--tp-glass-border)",
                }}
              >
                {LANGUAGE_LABELS[previewLang] ?? previewLang} (Translation)
              </div>
              <div
                ref={translationScrollRef}
                className="flex-1 overflow-y-auto p-6 scroll-smooth"
              >
                <div className="flex flex-col gap-5">
                  {previewSegments.length === 0 && (
                    <p className="text-sm text-[var(--tp-text-secondary)]">
                      Waiting for translation...
                    </p>
                  )}
                  {previewSegments.map((seg, i) => (
                    <AnimatedSegment
                      key={seg.id}
                      text={seg.text}
                      isFinal={seg.isFinal}
                      isDimmed={i < previewSegments.length - 5}
                      className="text-[1.15rem]"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== BOTTOM CONTROL BAR (72px) ===== */}
        <div
          className="shrink-0 h-[72px] flex items-center justify-between px-6"
          style={{
            backgroundColor: "var(--tp-bg-secondary)",
            borderTop: "1px solid var(--tp-glass-border)",
          }}
        >
          {/* Left: Mic button + Waveform */}
          <div className="flex items-center gap-4">
            <button
              className="w-[42px] h-[42px] rounded-full flex items-center justify-center cursor-pointer transition-all shrink-0"
              style={{
                border: `2px solid ${micStatus === "active" ? "var(--tp-accent-green)" : "var(--tp-accent-red)"}`,
                backgroundColor:
                  micStatus === "active"
                    ? "rgba(52, 211, 153, 0.1)"
                    : "rgba(248, 113, 113, 0.1)",
              }}
              onClick={async () => {
                if (micStatus === "active") {
                  stopMic();
                } else {
                  await startMic();
                }
              }}
              title="Toggle microphone"
            >
              <svg
                className="w-[18px] h-[18px]"
                viewBox="0 0 24 24"
                fill={
                  micStatus === "active"
                    ? "var(--tp-accent-green)"
                    : "var(--tp-accent-red)"
                }
              >
                <path d="M12 1a4 4 0 00-4 4v6a4 4 0 008 0V5a4 4 0 00-4-4z" />
                <path
                  d="M19 11a7 7 0 01-14 0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="12"
                  y1="19"
                  x2="12"
                  y2="23"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="8"
                  y1="23"
                  x2="16"
                  y2="23"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <div className="hidden md:block">
              <Waveform active={micStatus === "active"} />
            </div>
          </div>

          {/* Center: Timer */}
          <div className="text-center">
            <div
              className="text-[1.1rem] font-medium tracking-[0.05em] text-[var(--tp-text-primary)]"
              style={{ fontFamily: "var(--font-jetbrains)", minWidth: "5ch" }}
            >
              {formatTime(elapsed)}
            </div>
            <div className="text-[0.6rem] font-medium tracking-[0.1em] uppercase text-[var(--tp-text-secondary)]">
              Elapsed
            </div>
          </div>

          {/* Right: End button */}
          <button
            className="px-4 py-2 rounded-lg text-[0.75rem] font-semibold tracking-[0.04em] cursor-pointer transition-colors"
            style={{
              backgroundColor: "rgba(248, 113, 113, 0.1)",
              border: "1px solid rgba(248, 113, 113, 0.25)",
              color: "var(--tp-accent-red)",
            }}
            onClick={handleEndSession}
          >
            End Session
          </button>
        </div>
      </div>
    );
  }

  // Ended state
  return (
    <div
      className="flex flex-col items-center justify-center h-64 gap-4"
      style={{ backgroundColor: "var(--tp-bg-primary)" }}
    >
      <p className="text-lg font-semibold text-[var(--tp-text-primary)]">
        Session Ended
      </p>
      <p className="text-sm text-[var(--tp-text-secondary)]">
        The transcript has been saved.
      </p>
      <button
        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        style={{
          backgroundColor: "var(--tp-glass-bg)",
          border: "1px solid var(--tp-glass-border)",
          color: "var(--tp-text-primary)",
        }}
        onClick={() => setSessionState({ phase: "idle" })}
      >
        Start New Session
      </button>
    </div>
  );
}
