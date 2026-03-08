"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { createLiveSession } from "@/app/actions/live-session";
import { useRecordingAngelSocket } from "@/hooks/use-recording-angel-socket";
import { useAudioCapture } from "@/hooks/use-audio-capture";
import { Button } from "@/components/ui/button";
import { Copy, Globe, Mic, MicOff, Radio, Square, Check } from "lucide-react";
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
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll transcript panel
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
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
    errorMessage: micError,
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
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          You don&apos;t have permission to manage live sessions.
        </p>
      </div>
    );
  }

  // Idle state
  if (sessionState.phase === "idle") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Radio className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Live Visit</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Start a live session to broadcast real-time translated text to
          listeners.
        </p>
        <Button onClick={handleCreateSession} disabled={creating}>
          {creating ? "Creating..." : "Start Session"}
        </Button>
      </div>
    );
  }

  // Created state — show join code, wait for Go Live
  if (sessionState.phase === "created") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Join Code</p>
          <p className="text-5xl font-mono font-bold tracking-[0.3em]">
            {sessionState.joinCode}
          </p>
        </div>
        <Button variant="outline" onClick={handleCopyCode} className="gap-2">
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Copied!" : "Copy Join Link"}
        </Button>
        <Button size="lg" onClick={handleGoLive} className="gap-2">
          <Mic className="h-5 w-5" />
          Go Live
        </Button>
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
      <div className="flex flex-col h-full gap-4">
        {/* Top bar: status, join code, controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-green-600">
              <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <span className="font-semibold">LIVE</span>
            </div>
            <span className="text-muted-foreground text-sm">
              {formatTime(elapsed)}
            </span>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {micStatus === "active" ? (
                <Mic className="h-4 w-4 text-green-600" />
              ) : (
                <MicOff className="h-4 w-4 text-destructive" />
              )}
              <span>
                {micStatus === "active" ? "Mic on" : (micError ?? "Mic off")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-mono font-bold tracking-wider">
              {sessionState.joinCode}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="gap-1.5"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEndSession}
              className="gap-1.5"
            >
              <Square className="h-3.5 w-3.5" />
              End
            </Button>
          </div>
        </div>

        {/* Language picker for preview column */}
        {translationLanguages.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Preview:</span>
            <select
              value={previewLang ?? ""}
              onChange={(e) => setPreviewLang(e.target.value)}
              className="bg-transparent border border-border rounded px-2 py-1 text-sm"
            >
              {translationLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang] ?? lang}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Transcript columns */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto border border-border rounded-lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border min-h-full">
            {/* Source column */}
            <div className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                {LANGUAGE_LABELS[sourceLang] ?? sourceLang} (Source)
              </p>
              <div className="space-y-2">
                {sourceSegments.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Waiting for speech...
                  </p>
                )}
                {sourceSegments.map((seg) => (
                  <p
                    key={seg.id}
                    className={`text-sm leading-relaxed ${
                      seg.isFinal
                        ? "text-foreground"
                        : "text-muted-foreground italic"
                    }`}
                  >
                    {seg.text}
                  </p>
                ))}
              </div>
            </div>

            {/* Preview translation column */}
            {previewLang && (
              <div className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  {LANGUAGE_LABELS[previewLang] ?? previewLang} (Translation)
                </p>
                <div className="space-y-2">
                  {previewSegments.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Waiting for translation...
                    </p>
                  )}
                  {previewSegments.map((seg) => (
                    <p
                      key={seg.id}
                      className={`text-sm leading-relaxed ${
                        seg.isFinal
                          ? "text-foreground"
                          : "text-muted-foreground italic"
                      }`}
                    >
                      {seg.text}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Ended state
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-lg font-semibold">Session Ended</p>
      <p className="text-sm text-muted-foreground">
        The transcript has been saved.
      </p>
      <Button
        onClick={() => setSessionState({ phase: "idle" })}
        variant="outline"
      >
        Start New Session
      </Button>
    </div>
  );
}
