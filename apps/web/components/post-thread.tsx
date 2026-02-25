"use client";

import { useState } from "react";
import DOMPurify from "isomorphic-dompurify";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowUp,
  CalendarDays,
  MapPin,
  MessageCircle,
  Repeat2,
  Share,
  Trash2,
} from "lucide-react";
import { relativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ReplyDialog } from "./reply-dialog";

interface PostThreadProps {
  postId: Id<"posts">;
  title: string;
  content: string;
  type: string;
  author: { name: string; imageUrl?: string } | null;
  ward: { name: string; slug?: string } | null;
  createdAt: number;
  eventDate?: string;
  eventLocation?: string;
}

export function PostThread({
  postId,
  title,
  content,
  type,
  author,
  ward,
  createdAt,
  eventDate,
  eventLocation,
}: PostThreadProps) {
  const comments = useQuery(api.comments.listByPost, { postId });
  const currentUser = useQuery(api.users.currentUser);
  const createComment = useMutation(api.comments.create);
  const removeComment = useMutation(api.comments.remove);
  const commentCount = useQuery(api.comments.commentCount, { postId });
  const [inlineReply, setInlineReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const topLevel = comments?.filter((c) => !c.parentCommentId) ?? [];
  const replies = comments?.filter((c) => c.parentCommentId) ?? [];
  const getReplies = (id: Id<"comments">) =>
    replies.filter((r) => r.parentCommentId === id);

  const authorInitials = author?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const authorHandle =
    author?.name?.toLowerCase().replace(/\s+/g, "") ?? "unknown";

  const userInitials = currentUser?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const postDate = new Date(createdAt);
  const formattedDate = postDate.toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  async function handleInlineReply() {
    if (!inlineReply.trim()) return;
    setSubmitting(true);
    try {
      await createComment({ postId, content: inlineReply.trim() });
      setInlineReply("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* ─── Full post ─── */}
      <div className="px-4 pt-4">
        {/* Author header */}
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 shrink-0">
            {author?.imageUrl && <AvatarImage src={author.imageUrl} />}
            <AvatarFallback>{authorInitials ?? "?"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-bold text-[15px] leading-tight">
              {author?.name ?? "Unknown"}
            </p>
            {ward && (
              <p className="text-sm text-muted-foreground">
                @{ward.name.toLowerCase().replace(/\s+/g, "-")}
              </p>
            )}
          </div>
          {type !== "announcement" && (
            <Badge variant="secondary" className="ml-auto text-xs shrink-0">
              {type}
            </Badge>
          )}
        </div>

        {/* Post content (expanded, no truncation) */}
        <div className="mt-4">
          <h2 className="font-bold text-xl leading-tight">{title}</h2>
          <div
            className="prose prose-base max-w-none mt-3 text-foreground/90"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
          />

          {/* Event info */}
          {type === "event" && (eventDate || eventLocation) && (
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
              {eventDate && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {new Date(eventDate).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
              {eventLocation && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {eventLocation}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <p className="text-sm text-muted-foreground mt-4">{formattedDate}</p>
      </div>

      {/* Stats row */}
      {(commentCount ?? 0) > 0 && (
        <div className="px-4 py-3 border-t border-border mt-3">
          <span className="text-sm">
            <span className="font-bold">{commentCount}</span>{" "}
            <span className="text-muted-foreground">
              {commentCount === 1 ? "Reply" : "Replies"}
            </span>
          </span>
        </div>
      )}

      {/* Interaction bar */}
      <div className="flex items-center justify-around px-4 py-2 border-y border-border">
        <ReplyDialog
          postId={postId}
          post={{ title, content, author, ward, createdAt }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
        </ReplyDialog>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
          onClick={(e) => e.preventDefault()}
        >
          <Repeat2 className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
          onClick={(e) => e.preventDefault()}
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
          onClick={(e) => e.preventDefault()}
        >
          <Share className="h-5 w-5" />
        </Button>
      </div>

      {/* ─── Inline compose area ─── */}
      <div className="flex items-start gap-3 px-4 py-3 border-b border-border">
        <Avatar className="h-9 w-9 shrink-0 mt-0.5">
          {currentUser?.imageUrl && <AvatarImage src={currentUser.imageUrl} />}
          <AvatarFallback className="text-xs">
            {userInitials ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <input
            type="text"
            placeholder="Post your reply"
            value={inlineReply}
            onChange={(e) => setInlineReply(e.target.value)}
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/50 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && inlineReply.trim()) {
                e.preventDefault();
                handleInlineReply();
              }
            }}
          />
          <Button
            size="sm"
            disabled={!inlineReply.trim() || submitting}
            onClick={handleInlineReply}
            className="rounded-full px-4 h-8 text-xs font-bold shrink-0"
          >
            Reply
          </Button>
        </div>
      </div>

      {/* ─── Comment thread ─── */}
      <div>
        {!comments && (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            Loading replies...
          </div>
        )}

        {comments?.length === 0 && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No replies yet. Start the conversation!
          </div>
        )}

        {topLevel.map((comment) => {
          const commentReplies = getReplies(comment._id);
          const hasReplies = commentReplies.length > 0;
          const isOwn = comment.author?._id === currentUser?._id;

          return (
            <div key={comment._id}>
              <ThreadReply
                comment={comment}
                hasThreadLine={hasReplies}
                onDelete={
                  isOwn
                    ? () => removeComment({ commentId: comment._id })
                    : undefined
                }
              />
              {commentReplies.map((reply, idx) => {
                const isOwnReply = reply.author?._id === currentUser?._id;
                return (
                  <ThreadReply
                    key={reply._id}
                    comment={reply}
                    isReply
                    isLastReply={idx === commentReplies.length - 1}
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
    </div>
  );
}

/* ─── Thread reply card ─── */

function ThreadReply({
  comment,
  hasThreadLine,
  isReply,
  isLastReply,
  onDelete,
}: {
  comment: {
    _id: Id<"comments">;
    _creationTime: number;
    content: string;
    parentCommentId?: Id<"comments">;
    author: { _id: Id<"users">; name: string; imageUrl?: string } | null;
  };
  hasThreadLine?: boolean;
  isReply?: boolean;
  isLastReply?: boolean;
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
        "flex gap-3 px-4 border-b border-border hover:bg-muted/30 transition-colors",
        isReply ? "pl-10" : "",
      )}
    >
      {/* Avatar column */}
      <div className="flex flex-col items-center shrink-0 pt-3">
        {isReply && <div className="w-0.5 h-2 bg-border -mt-3 mb-1" />}
        <Avatar className={cn("shrink-0", isReply ? "h-8 w-8" : "h-10 w-10")}>
          {comment.author?.imageUrl && (
            <AvatarImage src={comment.author.imageUrl} />
          )}
          <AvatarFallback className={cn(isReply ? "text-[10px]" : "text-xs")}>
            {initials ?? "?"}
          </AvatarFallback>
        </Avatar>
        {hasThreadLine && <div className="w-0.5 flex-1 bg-border mt-1" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-3">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px] truncate">
            {comment.author?.name ?? "Unknown"}
          </span>
          <span className="text-sm text-muted-foreground truncate">
            @{handle}
          </span>
          <span className="text-sm text-muted-foreground">&middot;</span>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {relativeTime(comment._creationTime)}
          </span>
        </div>

        <p className="text-[15px] mt-1 whitespace-pre-wrap leading-relaxed text-foreground/90">
          {comment.content}
        </p>

        {/* Reply interaction bar */}
        <div className="flex items-center gap-1 mt-2 -ml-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10 gap-1.5 rounded-full"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
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
