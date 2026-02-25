"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Feed } from "@/components/feed";
import { CreatePostBar } from "@/components/create-post-bar";
import { useFeedFilter } from "@/components/feed-filter-context";
import { Button } from "@/components/ui/button";
import { UserPlus, Clock } from "lucide-react";
import { useState } from "react";

export default function WardFeedPage() {
  const params = useParams<{ stakeSlug: string; wardSlug: string }>();
  const stake = useQuery(api.stakes.getBySlug, { slug: params.stakeSlug });
  const ward = useQuery(
    api.wards.getBySlug,
    stake ? { slug: params.wardSlug, stakeId: stake._id } : "skip"
  );
  const permissions = useQuery(api.roles.myPermissions, {
    wardId: ward?._id,
  });
  const membershipStatus = useQuery(
    api.members.myWardMembershipStatus,
    ward ? { wardId: ward._id } : "skip"
  );
  const { typeFilter } = useFeedFilter();

  const isMember = membershipStatus?.status === "active";
  const isPending = membershipStatus?.status === "pending";

  if (!ward) return null;

  return (
    <>
      {isMember ? (
        <CreatePostBar
          wardId={ward._id}
          canPost={permissions?.includes("post:create") ?? false}
        />
      ) : (
        <VisitorBanner
          wardName={ward.name}
          wardId={ward._id}
          isPending={isPending}
        />
      )}
      <Feed wardId={ward._id} mode="ward" typeFilter={typeFilter} isMember={isMember} />
    </>
  );
}

function VisitorBanner({
  wardName,
  wardId,
  isPending,
}: {
  wardName: string;
  wardId: import("@/convex/_generated/dataModel").Id<"wards">;
  isPending: boolean;
}) {
  const requestToJoin = useMutation(api.members.requestToJoin);
  const [submitting, setSubmitting] = useState(false);
  const [requested, setRequested] = useState(false);

  async function handleJoin() {
    setSubmitting(true);
    try {
      await requestToJoin({ wardId });
      setRequested(true);
    } finally {
      setSubmitting(false);
    }
  }

  const showPending = isPending || requested;

  return (
    <div className="px-4 py-3 border-b border-border bg-muted/30">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          You&apos;re visiting <span className="font-medium text-foreground">{wardName}</span>
        </p>
        {showPending ? (
          <Button variant="outline" size="sm" disabled className="gap-1.5 shrink-0">
            <Clock className="h-3.5 w-3.5" />
            Request Pending
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={handleJoin}
            disabled={submitting}
            className="gap-1.5 shrink-0"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Request to Join
          </Button>
        )}
      </div>
    </div>
  );
}
