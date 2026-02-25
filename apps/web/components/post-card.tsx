"use client";

import DOMPurify from "isomorphic-dompurify";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUp, Globe, MessageCircle, Repeat2, Share } from "lucide-react";
import { relativeTime } from "@/lib/utils";
import { ReplyDialog } from "./reply-dialog";

interface PostCardProps {
  postId: Id<"posts">;
  title: string;
  content: string;
  type: string;
  author: { name: string; imageUrl?: string } | null;
  ward?: { name: string; slug?: string } | null;
  createdAt: number;
  eventDate?: string;
  eventLocation?: string;
  preferredLanguage?: string;
  isMember?: boolean;
}

export function PostCard({
  postId,
  title,
  content,
  type,
  author,
  ward,
  createdAt,
  eventDate,
  eventLocation,
  preferredLanguage,
  isMember = true,
}: PostCardProps) {
  const router = useRouter();
  const params = useParams<{ stakeSlug: string; wardSlug: string }>();

  const needsTranslation = preferredLanguage && preferredLanguage !== "en";
  const translation = useQuery(
    api.translations.getTranslation,
    needsTranslation ? { postId, language: preferredLanguage } : "skip",
  );

  const [showOriginal, setShowOriginal] = useState(false);

  const displayTitle = !showOriginal && translation ? translation.title : title;
  const displayContent =
    !showOriginal && translation ? translation.content : content;
  const displayEventLocation =
    !showOriginal && translation?.eventLocation
      ? translation.eventLocation
      : eventLocation;

  const count = useQuery(api.comments.commentCount, { postId });

  const initials = author?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Build the link to the post detail page
  const wardSlug = params.wardSlug ?? ward?.slug;
  const postHref =
    params.stakeSlug && wardSlug
      ? `/stake/${params.stakeSlug}/ward/${wardSlug}/post/${postId}`
      : undefined;

  function handleCardClick() {
    if (postHref) router.push(postHref);
  }

  return (
    <article
      className="group px-4 py-4 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          {author?.imageUrl && <AvatarImage src={author.imageUrl} />}
          <AvatarFallback>{initials ?? "?"}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Author line */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">
              {author?.name ?? "Unknown"}
            </span>
            {ward && (
              <span className="text-xs text-muted-foreground truncate">
                @{ward.name.toLowerCase().replace(/\s+/g, "-")}
              </span>
            )}
            <span className="text-xs text-muted-foreground">&middot;</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {relativeTime(createdAt)}
            </span>
            {type !== "announcement" && (
              <Badge variant="secondary" className="text-xs ml-auto shrink-0">
                {type}
              </Badge>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-base mt-1">{displayTitle}</h3>

          {/* Content */}
          <div
            className="prose prose-sm max-w-none mt-2 text-foreground/90"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(displayContent),
            }}
          />

          {/* Event info */}
          {type === "event" && (eventDate || eventLocation) && (
            <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
              {eventDate && (
                <span className="flex items-center gap-1">
                  📅{" "}
                  {new Date(eventDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
              {displayEventLocation && (
                <span className="flex items-center gap-1">
                  📍 {displayEventLocation}
                </span>
              )}
            </div>
          )}

          {/* Translation indicator */}
          {translation && !showOriginal && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowOriginal(true);
              }}
              className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Globe className="h-3 w-3" />
              Translated &middot; Show original
            </button>
          )}
          {showOriginal && translation && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowOriginal(false);
              }}
              className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Globe className="h-3 w-3" />
              Show translation
            </button>
          )}

          {/* Interaction bar — clicks here must NOT navigate */}
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div
            className="flex items-center gap-1 mt-3 -ml-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10 gap-1.5 rounded-full"
              onClick={(e) => e.preventDefault()}
            >
              <ArrowUp className="h-4 w-4" />
              <span className="text-xs">0</span>
            </Button>
            {isMember ? (
              <ReplyDialog
                postId={postId}
                post={{ title, content, author, ward, createdAt }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10 gap-1.5 rounded-full"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs">{count ?? 0}</span>
                </Button>
              </ReplyDialog>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground gap-1.5 rounded-full cursor-default opacity-50"
                disabled
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs">{count ?? 0}</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-muted gap-1.5 rounded-full"
              onClick={(e) => e.preventDefault()}
            >
              <Repeat2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-muted gap-1.5 rounded-full"
              onClick={(e) => e.preventDefault()}
            >
              <Share className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
