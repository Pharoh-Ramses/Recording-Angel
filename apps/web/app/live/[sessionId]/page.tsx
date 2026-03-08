"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useRecordingAngelSocket,
  type TranscriptMessage,
} from "@/hooks/use-recording-angel-socket";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

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
            <h2 className="text-2xl font-bold">Select Your Language</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Choose the language you want to read
            </p>
          </div>
          <div className="space-y-2">
            {languages.map((lang) => (
              <Button
                key={lang}
                variant="outline"
                className="w-full h-12 text-lg"
                onClick={() => handleJoinWithLanguage(lang)}
              >
                <Globe className="h-5 w-5 mr-2" />
                {LANGUAGE_LABELS[lang] ?? lang.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Status bar */}
      <div className="px-4 py-2 border-b border-border flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              sessionEnded
                ? "bg-muted-foreground"
                : status === "connected"
                  ? "bg-green-500"
                  : "bg-yellow-500"
            }`}
          />
          <span className="text-muted-foreground">
            {sessionEnded
              ? "Session ended"
              : status === "connected"
                ? "Live"
                : "Connecting..."}
          </span>
        </div>
        {selectedLang && languages.length > 1 && !sessionEnded && (
          <select
            value={selectedLang}
            onChange={(e) => handleSwitchLanguage(e.target.value)}
            className="bg-transparent border border-border rounded px-2 py-1 text-sm"
          >
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {LANGUAGE_LABELS[lang] ?? lang}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Transcript */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-3">
          {segments.length === 0 && !sessionEnded && (
            <p className="text-center text-muted-foreground text-lg">
              Waiting for speaker...
            </p>
          )}
          {segments.map((seg) => (
            <p
              key={seg.id}
              className={`text-lg leading-relaxed ${
                seg.isFinal ? "text-foreground" : "text-muted-foreground italic"
              }`}
            >
              {seg.text}
            </p>
          ))}
          {sessionEnded && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                This session has ended. The transcript has been saved.
              </p>
            </div>
          )}
        </div>
      </div>
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
