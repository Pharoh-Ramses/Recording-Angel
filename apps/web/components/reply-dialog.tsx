"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { relativeTime } from "@/lib/utils";
import DOMPurify from "isomorphic-dompurify";

interface ReplyDialogProps {
  postId: Id<"posts">;
  /** Original post data shown for context */
  post: {
    title: string;
    content: string;
    author: { name: string; imageUrl?: string } | null;
    ward?: { name: string } | null;
    createdAt: number;
  };
  children: React.ReactNode;
}

export function ReplyDialog({ postId, post, children }: ReplyDialogProps) {
  const currentUser = useQuery(api.users.currentUser);
  const createComment = useMutation(api.comments.create);
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const authorInitials = post.author?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const authorHandle =
    post.author?.name?.toLowerCase().replace(/\s+/g, "") ?? "unknown";

  const userInitials = currentUser?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSubmit() {
    if (!reply.trim()) return;
    setSubmitting(true);
    try {
      await createComment({
        postId,
        content: reply.trim(),
      });
      setReply("");
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 sm:max-w-xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
      >
        {/* Accessible title — visually hidden */}
        <DialogTitle className="sr-only">Reply to post</DialogTitle>

        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setOpen(false)}
            className="rounded-full p-1 hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="M6 6 18 18" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {/* Original post with thread line */}
          <div className="flex gap-3">
            {/* Avatar + thread line column */}
            <div className="flex flex-col items-center">
              <Avatar className="h-10 w-10 shrink-0">
                {post.author?.imageUrl && (
                  <AvatarImage src={post.author.imageUrl} />
                )}
                <AvatarFallback>{authorInitials ?? "?"}</AvatarFallback>
              </Avatar>
              {/* Thread line */}
              <div className="w-0.5 flex-1 bg-border mt-1 min-h-4" />
            </div>

            {/* Post content */}
            <div className="flex-1 min-w-0 pb-3">
              {/* Author line */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-[15px]">
                  {post.author?.name ?? "Unknown"}
                </span>
                {post.ward && (
                  <span className="text-sm text-muted-foreground">
                    @{post.ward.name.toLowerCase().replace(/\s+/g, "-")}
                  </span>
                )}
                <span className="text-sm text-muted-foreground">&middot;</span>
                <span className="text-sm text-muted-foreground">
                  {relativeTime(post.createdAt)}
                </span>
              </div>

              {/* Post title + content */}
              {post.title && (
                <p className="font-semibold text-[15px] mt-1">{post.title}</p>
              )}
              <div
                className="prose prose-sm max-w-none mt-1 text-[15px] leading-snug text-foreground/90 line-clamp-4"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(post.content),
                }}
              />
            </div>
          </div>

          {/* "Replying to" indicator */}
          <div className="flex gap-3 mt-0">
            {/* Spacer to align with thread line */}
            <div className="w-10 shrink-0" />
            <p className="text-sm text-muted-foreground pb-3">
              Replying to{" "}
              <span className="text-primary font-medium">@{authorHandle}</span>
            </p>
          </div>

          {/* Compose area */}
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              {currentUser?.imageUrl && (
                <AvatarImage src={currentUser.imageUrl} />
              )}
              <AvatarFallback>{userInitials ?? "?"}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <textarea
                placeholder="Post your reply"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={4}
                className="w-full resize-none bg-transparent text-[15px] leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
        </div>

        {/* Bottom toolbar */}
        <div className="flex items-center justify-end px-4 py-3 border-t border-border">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!reply.trim() || submitting}
            className="rounded-full px-5 h-9 text-sm font-bold"
          >
            Reply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
