"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Feed } from "../../../components/feed";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function StakeFeedPage() {
  const params = useParams<{ stakeSlug: string }>();
  const stake = useQuery(api.stakes.getBySlug, { slug: params.stakeSlug });
  const wards = useQuery(api.wards.listByStake, {
    stakeId: stake?._id!,
  });

  if (!stake) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{stake.name}</h1>

      {/* Ward links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Wards</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {wards?.map((ward) => (
            <Link
              key={ward._id}
              href={`/stake/${params.stakeSlug}/ward/${ward.slug}`}
            >
              <Button variant="outline" size="sm">
                {ward.name}
              </Button>
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Stake-level feed */}
      <h2 className="text-lg font-semibold">Stake Announcements</h2>
      <Feed stakeId={stake._id} mode="stake" />
    </div>
  );
}
