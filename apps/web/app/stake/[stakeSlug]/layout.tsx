"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function StakeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ stakeSlug: string }>();
  const stake = useQuery(api.stakes.getBySlug, { slug: params.stakeSlug });

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href={`/stake/${params.stakeSlug}`}>
            <span className="font-semibold">{stake?.name ?? "..."}</span>
          </Link>
          <UserButton />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
