"use client";

import DOMPurify from "isomorphic-dompurify";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUp, MessageCircle, Repeat2, Share } from "lucide-react";
import { relativeTime } from "@/lib/utils";

interface PostCardProps {
  title: string;
  content: string;
  type: string;
  author: { name: string; imageUrl?: string } | null;
  ward?: { name: string } | null;
  createdAt: number;
  eventDate?: string;
  eventLocation?: string;
}

export function PostCard({
  title,
  content,
  type,
  author,
  ward,
  createdAt,
  eventDate,
  eventLocation,
}: PostCardProps) {
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
          <h3 className="font-semibold text-base mt-1">{title}</h3>

          {/* Content */}
          <div
            className="prose prose-sm max-w-none mt-2 text-foreground/90"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
          />

          {/* Event info */}
          {type === "event" && (eventDate || eventLocation) && (
            <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
              {eventDate && (
                <span className="flex items-center gap-1">
                  📅 {new Date(eventDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
              {eventLocation && (
                <span className="flex items-center gap-1">
                  📍 {eventLocation}
                </span>
              )}
            </div>
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
