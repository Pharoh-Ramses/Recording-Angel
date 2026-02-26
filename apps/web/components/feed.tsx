"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PostCard } from "./post-card";
import { Button } from "@/components/ui/button";
import { Id } from "@/convex/_generated/dataModel";

interface FeedProps {
  wardId?: Id<"wards">;
  stakeId?: Id<"stakes">;
  mode: "ward" | "stake";
  typeFilter?: string;
  isMember?: boolean;
}

export function Feed({ wardId, stakeId, mode, typeFilter, isMember }: FeedProps) {
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

  const currentUser = useQuery(api.users.currentUser);
  const preferredLanguage = currentUser?.preferredLanguage;

  const feed = mode === "ward" ? wardFeed : stakeFeed;

  if (feed.status === "LoadingFirstPage") {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  const filteredResults = typeFilter
    ? feed.results.filter((post) => post.type === typeFilter)
    : feed.results;

  if (filteredResults.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        No posts yet. Be the first to share something!
      </div>
    );
  }

  return (
    <div>
      {filteredResults.map((post) => (
        <PostCard
          key={post._id}
          postId={post._id}
          title={post.title}
          content={post.content}
          type={post.type}
          author={post.author ?? null}
          ward={"ward" in post ? (post as any).ward : undefined}
          createdAt={post._creationTime}
          eventDate={post.eventDate}
          eventLocation={post.eventLocation}
          preferredLanguage={preferredLanguage}
          isMember={isMember ?? true}
          pollCloseDate={post.pollCloseDate}
        />
      ))}
      {feed.status === "CanLoadMore" && (
        <div className="flex justify-center py-4">
          <Button
            variant="ghost"
            className="text-sm text-muted-foreground"
            onClick={() => feed.loadMore(10)}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
