"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreatePostButton } from "./create-post-button";

interface CreatePostBarProps {
  wardId: Id<"wards">;
  canPost: boolean;
}

export function CreatePostBar({ wardId, canPost }: CreatePostBarProps) {
  const currentUser = useQuery(api.users.currentUser);

  const initials = currentUser?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!canPost) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
      <Avatar className="h-9 w-9 shrink-0">
        {currentUser?.imageUrl && (
          <AvatarImage src={currentUser.imageUrl} />
        )}
        <AvatarFallback className="text-xs">{initials ?? "?"}</AvatarFallback>
      </Avatar>
      <CreatePostButton wardId={wardId} triggerVariant="bar" />
    </div>
  );
}
