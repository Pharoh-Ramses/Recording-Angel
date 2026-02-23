"use client";

import DOMPurify from "isomorphic-dompurify";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
    <Card>
      <CardHeader className="flex flex-row items-start gap-3">
        <Avatar className="h-10 w-10">
          {author?.imageUrl && <AvatarImage src={author.imageUrl} />}
          <AvatarFallback>{initials ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{title}</CardTitle>
            <Badge variant="secondary">{type}</Badge>
            {ward && <Badge variant="outline">{ward.name}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            {author?.name ?? "Unknown"} &middot;{" "}
            {new Date(createdAt).toLocaleDateString()}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
        />
      </CardContent>
      {type === "event" && (eventDate || eventLocation) && (
        <CardFooter className="text-sm text-muted-foreground gap-4">
          {eventDate && <span>Date: {eventDate}</span>}
          {eventLocation && <span>Location: {eventLocation}</span>}
        </CardFooter>
      )}
    </Card>
  );
}
