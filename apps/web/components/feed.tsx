"use client";

import { usePaginatedQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { PostCard } from "./post-card";
import { Button } from "@/components/ui/button";
import { Id } from "../convex/_generated/dataModel";

interface FeedProps {
  wardId?: Id<"wards">;
  stakeId?: Id<"stakes">;
  mode: "ward" | "stake";
}

export function Feed({ wardId, stakeId, mode }: FeedProps) {
  const wardFeed = usePaginatedQuery(
    api.posts.listByWard,
    mode === "ward" && wardId ? { wardId } : "skip",
    { initialNumItems: 10 }
  );

  const stakeFeed = usePaginatedQuery(
    api.posts.listByStake,
    mode === "stake" && stakeId ? { stakeId } : "skip",
    { initialNumItems: 10 }
  );

  const feed = mode === "ward" ? wardFeed : stakeFeed;

  if (feed.status === "LoadingFirstPage") {
    return <p className="text-center text-muted-foreground py-8">Loading...</p>;
  }

  if (feed.results.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No posts yet. Be the first to share something!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {feed.results.map((post) => (
        <PostCard
          key={post._id}
          title={post.title}
          content={post.content}
          type={post.type}
          author={post.author ?? null}
          ward={"ward" in post ? (post as any).ward : undefined}
          createdAt={post._creationTime}
          eventDate={post.eventDate}
          eventLocation={post.eventLocation}
        />
      ))}
      {feed.status === "CanLoadMore" && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => feed.loadMore(10)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
