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
import { Reply } from "lucide-react";

interface CommentSheetProps {
  postId: Id<"posts">;
  children: React.ReactNode;
}

export function CommentSheet({ postId, children }: CommentSheetProps) {
  const comments = useQuery(api.comments.listByPost, { postId });
  const currentUser = useQuery(api.users.currentUser);
  const createComment = useMutation(api.comments.create);
  const removeComment = useMutation(api.comments.remove);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<Id<"comments"> | null>(null);
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
        parentCommentId: replyTo ?? undefined,
      });
      setNewComment("");
      setReplyTo(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Comments</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {!comments && (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
          {comments?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No comments yet. Start the conversation!
            </p>
          )}
          {topLevel.map((comment) => {
            const isOwn = comment.author?._id === currentUser?._id;
            return (
              <div key={comment._id}>
                <CommentItem
                  comment={comment}
                  onReply={() => setReplyTo(comment._id)}
                  onDelete={isOwn ? () => removeComment({ commentId: comment._id }) : undefined}
                />
                {getReplies(comment._id).map((reply) => {
                  const isOwnReply = reply.author?._id === currentUser?._id;
                  return (
                    <div key={reply._id} className="ml-8 mt-2">
                      <CommentItem
                        comment={reply}
                        onDelete={isOwnReply ? () => removeComment({ commentId: reply._id }) : undefined}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="border-t border-border pt-4 space-y-2">
          {replyTo && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Reply className="h-3 w-3" />
              <span>Replying to comment</span>
              <button
                onClick={() => setReplyTo(null)}
                className="text-foreground hover:underline"
              >
                Cancel
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              className="flex-1 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!newComment.trim() || submitting}
              className="self-end"
            >
              Post
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CommentItem({
  comment,
  onReply,
  onDelete,
}: {
  comment: {
    _id: Id<"comments">;
    content: string;
    _creationTime: number;
    author: { name: string; imageUrl?: string } | null;
  };
  onReply?: () => void;
  onDelete?: () => void;
}) {
  const initials = comment.author?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 shrink-0">
        {comment.author?.imageUrl && (
          <AvatarImage src={comment.author.imageUrl} />
        )}
        <AvatarFallback className="text-xs">{initials ?? "?"}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {comment.author?.name ?? "Unknown"}
          </span>
          <span className="text-xs text-muted-foreground">
            {relativeTime(comment._creationTime)}
          </span>
        </div>
        <p className="text-sm mt-0.5 whitespace-pre-wrap">{comment.content}</p>
        <div className="flex items-center gap-2 mt-1">
          {onReply && (
            <button
              onClick={onReply}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Reply
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
