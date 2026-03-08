"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getSessionTranscript } from "@/app/actions/live-archive";
import Link from "next/link";
import { ArrowLeft, Globe } from "lucide-react";

const LANGUAGE_LABELS: Record<string, string> = {
  source: "Original",
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

interface TranscriptSegment {
  id: string;
  sequence: number;
  sourceText: string;
  language: string;
  text: string;
  isFinal: boolean;
  createdAt: string;
}

export default function ArchiveDetailPage() {
  const params = useParams<{
    stakeSlug: string;
    wardSlug: string;
    sessionId: string;
  }>();
  const stake = useQuery(api.stakes.getBySlug, { slug: params.stakeSlug });
  const ward = useQuery(
    api.wards.getBySlug,
    stake ? { slug: params.wardSlug, stakeId: stake._id } : "skip",
  );
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLang, setSelectedLang] = useState("source");

  useEffect(() => {
    if (!ward || !stake) return;
    getSessionTranscript(params.sessionId, ward._id, stake._id)
      .then(setSegments)
      .finally(() => setLoading(false));
  }, [params.sessionId, ward, stake]);

  // Get unique languages from segments
  const languages = Array.from(new Set(segments.map((s) => s.language)));

  // Filter to final segments in selected language
  const filtered = segments.filter(
    (s) => s.language === selectedLang && s.isFinal,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading transcript...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <Link
          href={`/stake/${params.stakeSlug}/ward/${params.wardSlug}/live/archive`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to archives
        </Link>

        {languages.length > 1 && (
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="bg-transparent border border-border rounded px-2 py-1 text-sm"
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang] ?? lang}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground">
          No transcript available for this language.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((seg) => (
            <p key={seg.id} className="text-lg leading-relaxed">
              {seg.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
