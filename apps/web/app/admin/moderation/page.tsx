"use client";

import DOMPurify from "isomorphic-dompurify";
import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";

export default function AdminModerationPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
      <AdminModerationContent />
    </Suspense>
  );
}

function AdminModerationContent() {
  const searchParams = useSearchParams();
  const wardId = searchParams.get("ward") as Id<"wards"> | null;

  if (!wardId) {
    return <p className="text-muted-foreground">No ward selected.</p>;
  }

  return <ModerationQueue wardId={wardId} />;
}

function ModerationQueue({ wardId }: { wardId: Id<"wards"> }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.moderation.pendingPosts,
    { wardId },
    { initialNumItems: 20 }
  );

  const approvePost = useMutation(api.moderation.approvePost);
  const rejectPost = useMutation(api.moderation.rejectPost);

  if (status === "LoadingFirstPage") {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  if (results.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No posts pending review.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Moderation Queue</h1>
      {results.map((post) => (
        <ModerationCard
          key={post._id}
          post={post}
          onApprove={async () => {
            await approvePost({ postId: post._id });
          }}
          onReject={async (notes: string) => {
            await rejectPost({ postId: post._id, notes });
          }}
        />
      ))}
      {status === "CanLoadMore" && (
        <Button variant="outline" onClick={() => loadMore(20)}>
          Load more
        </Button>
      )}
    </div>
  );
}

function ModerationCard({
  post,
  onApprove,
  onReject,
}: {
  post: any;
  onApprove: () => Promise<void>;
  onReject: (notes: string) => Promise<void>;
}) {
  const [rejectNotes, setRejectNotes] = useState("");
  const [showReject, setShowReject] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{post.title}</CardTitle>
          <Badge variant="secondary">{post.type}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          By {post.author?.name ?? "Unknown"} &middot;{" "}
          {new Date(post._creationTime).toLocaleDateString()}
        </p>
        {post.moderationNotes && (
          <p className="text-xs text-orange-600">{post.moderationNotes}</p>
        )}
      </CardHeader>
      <CardContent>
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(post.content),
          }}
        />
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm" onClick={onApprove}>
          Approve
        </Button>
        {!showReject ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowReject(true)}
          >
            Reject
          </Button>
        ) : (
          <div className="flex gap-2 flex-1">
            <Input
              placeholder="Reason for rejection"
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              className="flex-1"
            />
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onReject(rejectNotes)}
              disabled={!rejectNotes.trim()}
            >
              Confirm
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
