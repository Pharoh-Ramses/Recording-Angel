"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { listArchivedSessions } from "@/app/actions/live-archive";
import Link from "next/link";
import { CalendarDays, Users, Clock } from "lucide-react";

interface ArchivedSession {
  id: string;
  sourceLang: string;
  targetLangs: string[];
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  listenerCount: number;
}

export default function ArchiveListPage() {
  const params = useParams<{ stakeSlug: string; wardSlug: string }>();
  const stake = useQuery(api.stakes.getBySlug, { slug: params.stakeSlug });
  const ward = useQuery(
    api.wards.getBySlug,
    stake ? { slug: params.wardSlug, stakeId: stake._id } : "skip",
  );
  const [sessions, setSessions] = useState<ArchivedSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ward || !stake) return;
    listArchivedSessions(ward._id, stake._id)
      .then(setSessions)
      .finally(() => setLoading(false));
  }, [ward, stake]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return "--";
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.round(ms / 60000);
    return `${mins} min`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No archived sessions yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h2 className="text-xl font-semibold mb-4">Past Sessions</h2>
      <div className="space-y-2">
        {sessions.map((session) => (
          <Link
            key={session.id}
            href={`/stake/${params.stakeSlug}/ward/${params.wardSlug}/live/archive/${session.id}`}
            className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {formatDate(session.createdAt)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session.targetLangs.join(", ")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(session.startedAt, session.endedAt)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {session.listenerCount}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
