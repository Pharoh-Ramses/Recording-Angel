"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useRecordingAngelSocket,
  type TranscriptMessage,
} from "@/hooks/use-recording-angel-socket";
import { AnimatedSegment } from "@/components/live/animated-segment";
import { LiveIndicator } from "@/components/live/live-indicator";
import { GlassLanguagePill } from "@/components/live/glass-language-pill";

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

function TranscriptViewInner() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") ?? "";
  const [languages, setLanguages] = useState<string[]>([]);
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const segmentCounter = useRef(0);
  const pendingConnectRef = useRef<{
    code: string;
    language: string;
  } | null>(null);

  // Fetch available languages
  useEffect(() => {
    async function fetchSession() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_RECORDING_ANGEL_URL;
        const res = await fetch(`${apiUrl}/sessions/${code}`);
        if (res.ok) {
          const data = await res.json();
          setLanguages(data.languages ?? []);
        }
      } catch {
        // Ignore — user may have navigated directly
      }
    }
    if (code) fetchSession();
  }, [code]);

  const handleTranscript = useCallback((msg: TranscriptMessage) => {
    setSegments((prev) => {
      // If not final, replace the last interim segment
      if (!msg.isFinal) {
        const lastIdx = prev.length - 1;
        if (lastIdx >= 0 && !prev[lastIdx]!.isFinal) {
          const updated = [...prev];
          updated[lastIdx] = { ...updated[lastIdx]!, text: msg.text };
          return updated;
        }
        segmentCounter.current++;
        return [
          ...prev,
          {
            id: segmentCounter.current,
            text: msg.text,
            language: msg.language,
            isFinal: false,
          },
        ];
      }

      // Final segment replaces the last interim
      const lastIdx = prev.length - 1;
      if (lastIdx >= 0 && !prev[lastIdx]!.isFinal) {
        const updated = [...prev];
        updated[lastIdx] = {
          ...updated[lastIdx]!,
          text: msg.text,
          language: msg.language,
          isFinal: true,
        };
        return updated;
      }

      segmentCounter.current++;
      return [
        ...prev,
        {
          id: segmentCounter.current,
          text: msg.text,
          language: msg.language,
          isFinal: true,
        },
      ];
    });
  }, []);

  const apiUrl = process.env.NEXT_PUBLIC_RECORDING_ANGEL_URL ?? "";
  const wsUrl = apiUrl.replace(/^http/, "ws") + "/ws";

  const { status, connect, send } = useRecordingAngelSocket({
    url: wsUrl,
    onTranscript: handleTranscript,
    onSessionEnded: () => setSessionEnded(true),
    onError: (msg) => console.error("Socket error:", msg.message),
  });

  // Send pending connect message when socket becomes connected
  useEffect(() => {
    if (status === "connected" && pendingConnectRef.current) {
      send(
        JSON.stringify({
          type: "listener:connect",
          code: pendingConnectRef.current.code,
          language: pendingConnectRef.current.language,
        }),
      );
      pendingConnectRef.current = null;
    }
  }, [status, send]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [segments]);

  const handleJoinWithLanguage = useCallback(
    (lang: string) => {
      setSelectedLang(lang);
      setShowLangPicker(false);
      pendingConnectRef.current = { code, language: lang };
      connect();
    },
    [connect, code],
  );

  const handleSwitchLanguage = useCallback(
    (lang: string) => {
      setSelectedLang(lang);
      send(JSON.stringify({ type: "listener:language", language: lang }));
    },
    [send],
  );

  if (showLangPicker && languages.length > 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div>
            <h2 className="text-2xl font-bold text-[var(--tp-text-primary)]">
              Select Your Language
            </h2>
            <p className="text-sm text-[var(--tp-text-secondary)] mt-1">
              Choose the language you want to read
            </p>
          </div>
          <div className="space-y-2">
            {languages.map((lang) => (
              <button
                key={lang}
                className="w-full h-12 text-lg rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                style={{
                  backgroundColor: "var(--tp-glass-bg)",
                  border: "1px solid var(--tp-glass-border)",
                  color: "var(--tp-text-primary)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--tp-glass-bg-hover)";
                  e.currentTarget.style.borderColor =
                    "var(--tp-glass-border-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--tp-glass-bg)";
                  e.currentTarget.style.borderColor = "var(--tp-glass-border)";
                }}
                onClick={() => handleJoinWithLanguage(lang)}
              >
                {LANGUAGE_LABELS[lang] ?? lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Top bar — fixed, gradient background */}
      <div
        className="fixed top-0 left-0 right-0 flex justify-between items-center px-5 py-4 z-50 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, var(--tp-bg-primary) 60%, transparent)",
        }}
      >
        <div className="pointer-events-auto">
          <LiveIndicator
            status={
              sessionEnded
                ? "ended"
                : status === "connected"
                  ? "live"
                  : "connecting"
            }
          />
        </div>
        {selectedLang && !sessionEnded && (
          <div className="pointer-events-auto">
            <GlassLanguagePill
              language={selectedLang}
              languages={languages}
              onSwitch={handleSwitchLanguage}
            />
          </div>
        )}
      </div>

      {/* Transcript viewport */}
      <div
        ref={scrollRef}
        className="fixed inset-0 overflow-y-auto scroll-smooth"
        style={{
          WebkitOverflowScrolling: "touch",
          padding: "5rem 1.5rem 8rem",
        }}
      >
        <div className="max-w-[620px] mx-auto flex flex-col gap-6 min-h-full justify-end">
          {segments.length === 0 && !sessionEnded && (
            <p className="text-center text-[var(--tp-text-secondary)] text-lg">
              Waiting for speaker...
            </p>
          )}
          {segments.map((seg, i) => (
            <AnimatedSegment
              key={seg.id}
              text={seg.text}
              isFinal={seg.isFinal}
              isDimmed={i < segments.length - 4}
              className="text-[1.5rem] max-[480px]:text-[1.35rem] min-[768px]:text-[1.65rem]"
            />
          ))}
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div
        className="fixed bottom-0 left-0 right-0 h-28 pointer-events-none z-50"
        style={{
          background:
            "linear-gradient(to top, var(--tp-bg-primary) 15%, transparent)",
        }}
      />

      {/* Session ended overlay */}
      {sessionEnded && (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center z-[200] animate-[tp-segment-in_1s_ease_forwards]"
          style={{ backgroundColor: "var(--tp-bg-primary)" }}
        >
          <div
            className="w-12 h-px mb-6"
            style={{ backgroundColor: "rgba(240, 240, 242, 0.2)" }}
          />
          <p
            className="text-[0.85rem] font-medium tracking-[0.08em] uppercase"
            style={{ color: "rgba(240, 240, 242, 0.4)" }}
          >
            Session ended
          </p>
        </div>
      )}
    </div>
  );
}

export default function LiveSessionPage() {
  return (
    <Suspense>
      <TranscriptViewInner />
    </Suspense>
  );
}
