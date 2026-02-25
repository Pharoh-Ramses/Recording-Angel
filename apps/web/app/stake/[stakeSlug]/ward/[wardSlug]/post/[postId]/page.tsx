"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PostThread } from "@/components/post-thread";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PostPage({
  params,
}: {
  params: Promise<{ stakeSlug: string; wardSlug: string; postId: string }>;
}) {
  const { postId } = use(params);
  const router = useRouter();
  const post = useQuery(api.posts.getById, {
    postId: postId as Id<"posts">,
  });

  if (post === undefined) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (post === null) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-sm text-muted-foreground">Post not found.</p>
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-center gap-4 px-4 py-2 bg-background/80 backdrop-blur-sm border-b border-border">
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-full"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-bold text-lg">Post</h1>
      </div>

      <PostThread
        postId={post._id}
        title={post.title}
        content={post.content}
        type={post.type}
        author={post.author ?? null}
        ward={post.ward ?? null}
        createdAt={post._creationTime}
        eventDate={post.eventDate}
        eventLocation={post.eventLocation}
      />
    </div>
  );
}
