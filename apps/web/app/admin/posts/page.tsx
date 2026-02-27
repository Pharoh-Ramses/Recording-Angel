"use client";

import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { label: "All", value: undefined },
  { label: "Approved", value: "approved" as const },
  { label: "Pending", value: "pending_review" as const },
  { label: "Rejected", value: "rejected" as const },
];

const STATUS_STYLES: Record<string, string> = {
  approved:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  pending_review:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  rejected:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  draft:
    "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function AdminPostsPage() {
  const searchParams = useSearchParams();
  const wardId = searchParams.get("ward") as Id<"wards"> | null;

  if (!wardId) {
    return <p className="text-muted-foreground">No ward selected.</p>;
  }

  return <PostsContent wardId={wardId} />;
}

function PostsContent({ wardId }: { wardId: Id<"wards"> }) {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined
  );

  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.listForAdmin,
    { wardId, status: statusFilter as any },
    { initialNumItems: 20 }
  );

  const approvePost = useMutation(api.moderation.approvePost);
  const rejectPost = useMutation(api.moderation.rejectPost);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Posts</h1>

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b border-border">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.label}
            onClick={() => setStatusFilter(filter.value)}
            className={cn(
              "px-3 py-2 text-sm transition-colors border-b-2 -mb-px",
              statusFilter === filter.value
                ? "border-primary text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Post list */}
      {status === "LoadingFirstPage" ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : results.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No posts found.
        </p>
      ) : (
        <div className="space-y-2">
          {results.map((post) => (
            <div
              key={post._id}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium truncate">{post.title}</p>
                  <Badge variant="secondary" className="text-xs">
                    {post.type}
                  </Badge>
                  <span
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full font-medium",
                      STATUS_STYLES[post.status] ?? ""
                    )}
                  >
                    {post.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  By {post.author?.name ?? "Unknown"} &middot;{" "}
                  {new Date(post._creationTime).toLocaleDateString()}
                </p>
              </div>
              {post.status === "pending_review" && (
                <div className="flex gap-2 shrink-0 ml-3">
                  <Button
                    size="sm"
                    onClick={() => approvePost({ postId: post._id })}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      rejectPost({
                        postId: post._id,
                        notes: "Rejected via admin",
                      })
                    }
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
          {status === "CanLoadMore" && (
            <Button variant="outline" onClick={() => loadMore(20)}>
              Load more
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
