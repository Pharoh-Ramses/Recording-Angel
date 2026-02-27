"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { Pin, PinOff } from "lucide-react";
import { Suspense } from "react";

export default function AdminPollsPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
      <AdminPollsContent />
    </Suspense>
  );
}

function AdminPollsContent() {
  const searchParams = useSearchParams();
  const wardId = searchParams.get("ward") as Id<"wards"> | null;

  if (!wardId) {
    return <p className="text-muted-foreground">No ward selected.</p>;
  }

  return <PollsList wardId={wardId} />;
}

function PollsList({ wardId }: { wardId: Id<"wards"> }) {
  const polls = useQuery(api.polls.listApprovedForWard, { wardId });
  const pinPoll = useMutation(api.polls.pinPoll);
  const unpinPoll = useMutation(api.polls.unpinPoll);

  if (polls === undefined) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  const pinnedCount = polls.filter((p) => p.isPinned).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Polls</h1>
        <Badge variant="secondary">
          {pinnedCount} / 3 pinned
        </Badge>
      </div>

      {polls.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No approved polls in this ward.
        </p>
      ) : (
        <div className="space-y-2">
          {polls.map((poll) => (
            <div
              key={poll._id}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{poll.title}</p>
                  {poll.isPinned && (
                    <Badge variant="default" className="shrink-0">
                      Pinned
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  By {poll.author?.name ?? "Unknown"} &middot;{" "}
                  {new Date(poll._creationTime).toLocaleDateString()} &middot;{" "}
                  {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"}
                </p>
              </div>
              <div className="shrink-0 ml-3">
                {poll.isPinned ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => unpinPoll({ postId: poll._id })}
                  >
                    <PinOff className="h-4 w-4 mr-1.5" />
                    Unpin
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => pinPoll({ postId: poll._id })}
                    disabled={pinnedCount >= 3}
                  >
                    <Pin className="h-4 w-4 mr-1.5" />
                    Pin
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
