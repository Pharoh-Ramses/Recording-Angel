"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Feed } from "@/components/feed";
import { CreatePostBar } from "@/components/create-post-bar";
import { useFeedFilter } from "@/components/feed-filter-context";

export default function WardFeedPage() {
  const params = useParams<{ stakeSlug: string; wardSlug: string }>();
  const ward = useQuery(api.wards.getBySlug, { slug: params.wardSlug });
  const permissions = useQuery(api.roles.myPermissions, {
    wardId: ward?._id,
  });
  const { typeFilter } = useFeedFilter();

  if (!ward) return null;

  return (
    <>
      <CreatePostBar
        wardId={ward._id}
        canPost={permissions?.includes("post:create") ?? false}
      />
      <Feed wardId={ward._id} mode="ward" typeFilter={typeFilter} />
    </>
  );
}
