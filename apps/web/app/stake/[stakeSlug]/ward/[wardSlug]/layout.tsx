"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { FeedFilterProvider, useFeedFilter } from "@/components/feed-filter-context";

function WardLayoutInner({ children }: { children: React.ReactNode }) {
  const params = useParams<{ stakeSlug: string; wardSlug: string }>();
  const ward = useQuery(api.wards.getBySlug, { slug: params.wardSlug });
  const { typeFilter, setTypeFilter } = useFeedFilter();

  return (
    <AppShell
      wardId={ward?._id}
      stakeId={ward?.stakeId}
      typeFilter={typeFilter}
      onTypeFilterChange={setTypeFilter}
    >
      {children}
    </AppShell>
  );
}

export default function WardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FeedFilterProvider>
      <WardLayoutInner>{children}</WardLayoutInner>
    </FeedFilterProvider>
  );
}
