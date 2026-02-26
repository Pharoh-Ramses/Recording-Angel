"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Check, Clock } from "lucide-react";

interface PollCardProps {
  postId: Id<"posts">;
  pollCloseDate?: string;
  isMember?: boolean;
}

export function PollCard({ postId, pollCloseDate, isMember = true }: PollCardProps) {
  const options = useQuery(api.polls.getOptions, { postId });
  const myVote = useQuery(api.polls.myVote, { postId });
  const results = useQuery(api.polls.getResults, { postId });
  const vote = useMutation(api.polls.vote);
  const [voting, setVoting] = useState(false);

  const isExpired = pollCloseDate ? new Date(pollCloseDate) < new Date() : false;
  const hasVoted = myVote !== null && myVote !== undefined && myVote.optionId !== undefined;
  const showResults = hasVoted || isExpired;

  async function handleVote(optionId: Id<"pollOptions">) {
    if (voting || hasVoted || isExpired || !isMember) return;
    setVoting(true);
    try {
      await vote({ postId, optionId });
    } finally {
      setVoting(false);
    }
  }

  if (!options) return null;

  // Results view (after voting or expired)
  if (showResults && results) {
    return (
      <div className="mt-3 space-y-2">
        {results.options.map((option) => {
          const percentage =
            results.totalVotes > 0
              ? Math.round((option.voteCount / results.totalVotes) * 100)
              : 0;
          const isMyVote = hasVoted && myVote?.optionId === option._id;

          return (
            <div key={option._id} className="relative">
              <div className="flex items-center justify-between text-sm py-2 px-3 rounded-lg border border-border relative overflow-hidden">
                {/* Background bar */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-lg transition-all",
                    isMyVote ? "bg-primary/15" : "bg-muted/50"
                  )}
                  style={{ width: `${percentage}%` }}
                />
                {/* Content */}
                <span className="relative flex items-center gap-2 font-medium">
                  {option.label}
                  {isMyVote && <Check className="h-3.5 w-3.5 text-primary" />}
                </span>
                <span className="relative text-muted-foreground text-xs">
                  {percentage}% ({option.voteCount})
                </span>
              </div>
            </div>
          );
        })}
        <PollFooter
          totalVotes={results.totalVotes}
          pollCloseDate={pollCloseDate}
          isExpired={isExpired}
        />
      </div>
    );
  }

  // Voting view (before voting)
  return (
    <div className="mt-3 space-y-2">
      {options.map((option) => (
        <button
          key={option._id}
          onClick={(e) => {
            e.stopPropagation();
            handleVote(option._id);
          }}
          disabled={voting || !isMember}
          className={cn(
            "w-full text-left text-sm py-2 px-3 rounded-lg border border-border transition-colors",
            isMember
              ? "hover:bg-accent hover:border-accent-foreground/20 cursor-pointer"
              : "opacity-60 cursor-default"
          )}
        >
          {option.label}
        </button>
      ))}
      <PollFooter
        totalVotes={results?.totalVotes ?? 0}
        pollCloseDate={pollCloseDate}
        isExpired={isExpired}
      />
    </div>
  );
}

function PollFooter({
  totalVotes,
  pollCloseDate,
  isExpired,
}: {
  totalVotes: number;
  pollCloseDate?: string;
  isExpired: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
      <span>
        {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
      </span>
      {pollCloseDate && (
        <>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {isExpired
              ? `Closed ${new Date(pollCloseDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
              : `Closes ${new Date(pollCloseDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
          </span>
        </>
      )}
    </div>
  );
}
