"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "./rich-text-editor";

export function CreatePostButton({
  wardId,
  triggerVariant = "button",
}: {
  wardId: Id<"wards">;
  triggerVariant?: "button" | "bar";
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"announcement" | "event" | "classifieds">(
    "announcement"
  );
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");

  const createPost = useMutation(api.posts.create);

  async function handleSubmit() {
    if (!title.trim() || !content.trim()) return;

    await createPost({
      wardId,
      type,
      title: title.trim(),
      content,
      eventDate: type === "event" ? eventDate : undefined,
      eventLocation: type === "event" ? eventLocation : undefined,
    });

    setTitle("");
    setContent("");
    setType("announcement");
    setEventDate("");
    setEventLocation("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerVariant === "bar" ? (
          <button className="flex-1 text-left text-sm text-muted-foreground hover:text-foreground transition-colors rounded-full bg-muted/50 px-4 py-2">
            What&apos;s on your mind?
          </button>
        ) : (
          <Button>New Post</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select
            value={type}
            onValueChange={(v) => setType(v as typeof type)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="announcement">Announcement</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="classifieds">Classifieds</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Post title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Write your post..."
          />

          {type === "event" && (
            <>
              <Input
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
              <Input
                placeholder="Location"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
              />
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Post</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
