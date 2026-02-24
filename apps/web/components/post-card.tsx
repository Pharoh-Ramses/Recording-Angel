"use client";

import DOMPurify from "isomorphic-dompurify";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUp, Globe, MessageCircle, Repeat2, Share } from "lucide-react";
import { relativeTime } from "@/lib/utils";

interface PostCardProps {
  postId: Id<"posts">;
  title: string;
  content: string;
  type: string;
  author: { name: string; imageUrl?: string } | null;
  ward?: { name: string } | null;
  createdAt: number;
  eventDate?: string;
  eventLocation?: string;
  preferredLanguage?: string;
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
}: PostCardProps) {
  const needsTranslation = preferredLanguage && preferredLanguage !== "en";
  const translation = useQuery(
    api.translations.getTranslation,
    needsTranslation ? { postId, language: preferredLanguage } : "skip"
  );

  const [showOriginal, setShowOriginal] = useState(false);

  const displayTitle = !showOriginal && translation ? translation.title : title;
  const displayContent = !showOriginal && translation ? translation.content : content;
  const displayEventLocation =
    !showOriginal && translation?.eventLocation
      ? translation.eventLocation
      : eventLocation;

  const initials = author?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="group px-4 py-4 border-b border-border hover:bg-muted/30 transition-colors">
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
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(displayContent) }}
          />

          {/* Event info */}
          {type === "event" && (eventDate || eventLocation) && (
            <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
              {eventDate && (
                <span className="flex items-center gap-1">
                  📅 {new Date(eventDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
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
              onClick={() => setShowOriginal(true)}
              className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Globe className="h-3 w-3" />
              Translated &middot; Show original
            </button>
          )}
          {showOriginal && translation && (
            <button
              onClick={() => setShowOriginal(false)}
              className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Globe className="h-3 w-3" />
              Show translation
            </button>
          )}

          {/* Interaction bar */}
          <div className="flex items-center gap-1 mt-3 -ml-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground gap-1.5"
              onClick={(e) => e.preventDefault()}
            >
              <ArrowUp className="h-4 w-4" />
              <span className="text-xs">0</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground gap-1.5"
              onClick={(e) => e.preventDefault()}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">0</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground gap-1.5"
              onClick={(e) => e.preventDefault()}
            >
              <Repeat2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground gap-1.5"
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
