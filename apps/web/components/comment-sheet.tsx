"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { relativeTime } from "@/lib/utils";
import { MessageCircle, CornerDownRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommentSheetProps {
  postId: Id<"posts">;
  children: React.ReactNode;
  isMember?: boolean;
}

type CommentData = {
  _id: Id<"comments">;
  _creationTime: number;
  content: string;
  parentCommentId?: Id<"comments">;
  author: { _id: Id<"users">; name: string; imageUrl?: string } | null;
};

export function CommentSheet({ postId, children, isMember = true }: CommentSheetProps) {
  const comments = useQuery(api.comments.listByPost, { postId });
  const currentUser = useQuery(api.users.currentUser);
  const createComment = useMutation(api.comments.create);
  const removeComment = useMutation(api.comments.remove);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{
    id: Id<"comments">;
    name: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const topLevel = comments?.filter((c) => !c.parentCommentId) ?? [];
  const replies = comments?.filter((c) => c.parentCommentId) ?? [];

  const getReplies = (commentId: Id<"comments">) =>
    replies.filter((r) => r.parentCommentId === commentId);

  async function handleSubmit() {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await createComment({
        postId,
        content: newComment.trim(),
        parentCommentId: replyTo?.id ?? undefined,
      });
      setNewComment("");
      setReplyTo(null);
    } finally {
      setSubmitting(false);
    }
  }

  const userInitials = currentUser?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="text-base">Replies</SheetTitle>
        </SheetHeader>

        {/* Thread */}
        <div className="flex-1 overflow-y-auto">
          {!comments && (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          )}

          {comments?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <MessageCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-foreground">
                No replies yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Be the first to join the conversation.
              </p>
            </div>
          )}

          {topLevel.map((comment) => {
            const commentReplies = getReplies(comment._id);
            const hasReplies = commentReplies.length > 0;
            const isOwn = comment.author?._id === currentUser?._id;

            return (
              <div key={comment._id}>
                {/* Parent comment */}
                <ReplyCard
                  comment={comment}
                  hasThreadLine={hasReplies}
                  onReply={() =>
                    setReplyTo({
                      id: comment._id,
                      name: comment.author?.name ?? "someone",
                    })
                  }
                  onDelete={
                    isOwn
                      ? () => removeComment({ commentId: comment._id })
                      : undefined
                  }
                />

                {/* Threaded replies */}
                {commentReplies.map((reply, idx) => {
                  const isOwnReply = reply.author?._id === currentUser?._id;
                  const isLast = idx === commentReplies.length - 1;
                  return (
                    <ReplyCard
                      key={reply._id}
                      comment={reply}
                      isReply
                      isLastReply={isLast}
                      onDelete={
                        isOwnReply
                          ? () => removeComment({ commentId: reply._id })
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Compose area */}
        {isMember ? (
          <div className="border-t border-border">
            {/* Reply-to indicator */}
            {replyTo && (
              <div className="flex items-center gap-2 px-4 pt-3 pb-0">
                <span className="text-xs text-muted-foreground">
                  Replying to{" "}
                  <span className="text-primary font-medium">
                    @{replyTo.name.toLowerCase().replace(/\s+/g, "")}
                  </span>
                </span>
                <button
                  onClick={() => setReplyTo(null)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="flex items-start gap-3 p-4">
              <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                {currentUser?.imageUrl && (
                  <AvatarImage src={currentUser.imageUrl} />
                )}
                <AvatarFallback className="text-xs">
                  {userInitials ?? "?"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <Textarea
                  placeholder={
                    replyTo ? `Reply to @${replyTo.name}...` : "Post your reply"
                  }
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                  className="resize-none border-0 bg-transparent p-0 focus-visible:ring-0 text-sm placeholder:text-muted-foreground/60"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                />
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!newComment.trim() || submitting}
                    className="rounded-full px-4 h-8 text-xs font-semibold"
                  >
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t border-border pt-4 pb-4">
            <p className="text-sm text-muted-foreground text-center py-2">
              Join this ward to comment on posts.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ─── Reply card (X.com style) ─── */

function ReplyCard({
  comment,
  hasThreadLine,
  isReply,
  isLastReply,
  onReply,
  onDelete,
}: {
  comment: CommentData;
  hasThreadLine?: boolean;
  isReply?: boolean;
  isLastReply?: boolean;
  onReply?: () => void;
  onDelete?: () => void;
}) {
  const initials = comment.author?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handle =
    comment.author?.name?.toLowerCase().replace(/\s+/g, "") ?? "unknown";

  return (
    <article
      className={cn(
        "flex gap-3 px-4 transition-colors hover:bg-muted/30",
        isReply ? "pl-8" : "",
      )}
    >
      {/* Avatar column with thread line */}
      <div className="flex flex-col items-center shrink-0">
        {/* Connector line from parent (for replies) */}
        {isReply && <div className="w-0.5 h-3 bg-border" />}

        <Avatar className={cn("shrink-0", isReply ? "h-7 w-7" : "h-9 w-9")}>
          {comment.author?.imageUrl && (
            <AvatarImage src={comment.author.imageUrl} />
          )}
          <AvatarFallback className={cn(isReply ? "text-[10px]" : "text-xs")}>
            {initials ?? "?"}
          </AvatarFallback>
        </Avatar>

        {/* Thread line below avatar (connects to replies) */}
        {hasThreadLine && <div className="w-0.5 flex-1 bg-border mt-1" />}
      </div>

      {/* Content column */}
      <div
        className={cn(
          "flex-1 min-w-0",
          isReply && isLastReply ? "pb-3" : "pb-3",
        )}
      >
        {/* Author line */}
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm truncate">
            {comment.author?.name ?? "Unknown"}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            @{handle}
          </span>
          <span className="text-xs text-muted-foreground">&middot;</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {relativeTime(comment._creationTime)}
          </span>
        </div>

        {/* Reply-to indicator for threaded replies */}
        {isReply && comment.author && (
          <p className="text-xs text-muted-foreground mt-0.5">
            <CornerDownRight className="h-3 w-3 inline mr-1" />
            replying
          </p>
        )}

        {/* Comment content */}
        <p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed text-foreground/90">
          {comment.content}
        </p>

        {/* Interaction bar */}
        <div className="flex items-center gap-1 mt-2 -ml-2">
          {onReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-primary gap-1.5 rounded-full"
              onClick={onReply}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="text-xs">Reply</span>
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-destructive gap-1.5 rounded-full"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
