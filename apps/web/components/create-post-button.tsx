"use client";

import { Button } from "@/components/ui/button";
import { Id } from "../convex/_generated/dataModel";

export function CreatePostButton({ wardId }: { wardId: Id<"wards"> }) {
  return <Button disabled>New Post (coming soon)</Button>;
}
