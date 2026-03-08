"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { createLiveSession } from "@/app/actions/live-session";
import { useRecordingAngelSocket } from "@/hooks/use-recording-angel-socket";
import { useAudioCapture } from "@/hooks/use-audio-capture";
import { Button } from "@/components/ui/button";
import { Copy, Mic, MicOff, Radio, Square, Check } from "lucide-react";
import { toast } from "sonner";

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
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-6">
        <div className="flex items-center gap-2 text-green-600">
          <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
          <span className="font-semibold">LIVE</span>
          <span className="text-muted-foreground ml-2">
            {formatTime(elapsed)}
          </span>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Join Code</p>
          <p className="text-4xl font-mono font-bold tracking-[0.3em]">
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

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {micStatus === "active" ? (
            <Mic className="h-4 w-4 text-green-600" />
          ) : (
            <MicOff className="h-4 w-4 text-destructive" />
          )}
          <span>
            {micStatus === "active"
              ? "Microphone active"
              : (micError ?? "Microphone inactive")}
          </span>
        </div>

        <Button
          variant="destructive"
          onClick={handleEndSession}
          className="gap-2"
        >
          <Square className="h-4 w-4" />
          End Session
        </Button>
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
