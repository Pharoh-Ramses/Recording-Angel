"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Feed } from "../../../../components/feed";
import { CreatePostButton } from "../../../../components/create-post-button";

export default function WardFeedPage() {
  const params = useParams<{ stakeSlug: string; wardSlug: string }>();
  const ward = useQuery(api.wards.getBySlug, { slug: params.wardSlug });
  const permissions = useQuery(api.roles.myPermissions, {
    wardId: ward?._id,
  });

  if (!ward) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{ward.name} Feed</h1>
        {permissions?.includes("post:create") && (
          <CreatePostButton wardId={ward._id} />
        )}
      </div>
      <Feed wardId={ward._id} mode="ward" />
    </div>
  );
}
