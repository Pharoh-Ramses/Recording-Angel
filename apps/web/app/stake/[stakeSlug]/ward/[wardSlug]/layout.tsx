"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function WardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ stakeSlug: string; wardSlug: string }>();
  const stake = useQuery(api.stakes.getBySlug, { slug: params.stakeSlug });
  const ward = useQuery(api.wards.getBySlug, { slug: params.wardSlug });
  const permissions = useQuery(api.roles.myPermissions, {
    wardId: ward?._id,
  });

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href={`/stake/${params.stakeSlug}`}>
              <span className="text-sm text-muted-foreground">
                {stake?.name}
              </span>
            </Link>
            <span className="text-sm text-muted-foreground">/</span>
            <span className="font-semibold">{ward?.name}</span>
          </div>
          <div className="flex items-center gap-3">
            {permissions?.includes("member:approve") && (
              <Link href={`/stake/${params.stakeSlug}/ward/${params.wardSlug}/members`}>
                <Button variant="outline" size="sm">
                  Members
                </Button>
              </Link>
            )}
            {permissions?.includes("post:approve") && (
              <Link href="/moderation">
                <Button variant="outline" size="sm">
                  Moderation
                </Button>
              </Link>
            )}
            <UserButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
