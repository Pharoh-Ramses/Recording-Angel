"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Feed } from "@/components/feed";
import { AppShell } from "@/components/app-shell";
import { FeedFilterProvider, useFeedFilter } from "@/components/feed-filter-context";

function StakeFeedInner() {
  const params = useParams<{ stakeSlug: string }>();
  const stake = useQuery(api.stakes.getBySlug, { slug: params.stakeSlug });
  const { typeFilter } = useFeedFilter();

  if (!stake) return null;

  return (
    <>
      <div className="px-4 py-3 border-b border-border">
        <h1 className="font-semibold text-lg">{stake.name}</h1>
        <p className="text-xs text-muted-foreground">Stake Announcements</p>
      </div>
      <Feed stakeId={stake._id} mode="stake" typeFilter={typeFilter} />
    </>
  );
}

function StakePageWithShell() {
  const params = useParams<{ stakeSlug: string }>();
  const stake = useQuery(api.stakes.getBySlug, { slug: params.stakeSlug });
  const { typeFilter, setTypeFilter } = useFeedFilter();

  return (
    <AppShell
      stakeId={stake?._id}
      typeFilter={typeFilter}
      onTypeFilterChange={setTypeFilter}
    >
      <StakeFeedInner />
    </AppShell>
  );
}

export default function StakeFeedPage() {
  return (
    <FeedFilterProvider>
      <StakePageWithShell />
    </FeedFilterProvider>
  );
}
