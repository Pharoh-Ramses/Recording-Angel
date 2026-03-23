"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";

import { MissionaryCalendarShell } from "@/components/missionary/missionary-calendar-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";

export default function MissionariesPage() {
  const params = useParams<{ stakeSlug: string; wardSlug: string }>();
  const stake = useQuery(api.stakes.getBySlug, { slug: params.stakeSlug });
  const ward = useQuery(
    api.wards.getBySlug,
    stake ? { slug: params.wardSlug, stakeId: stake._id } : "skip",
  );
  const access = useQuery(api.missionaries.myWardAccess, ward ? { wardId: ward._id } : "skip");

  if (stake === undefined) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">Loading missionary hub...</p>;
  }

  if (!stake) {
    return (
      <div className="px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Missionary hub</CardTitle>
            <CardDescription>The stake could not be found.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (ward === undefined || access === undefined) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">Loading missionary hub...</p>;
  }

  if (!ward) {
    return (
      <div className="px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Missionary hub</CardTitle>
            <CardDescription>The ward could not be found.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!access.canAccessMissionaryAdmin && !access.isAssignedMissionary) {
    return (
      <div className="px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Missionary hub</CardTitle>
            <CardDescription>
              This page is for assigned missionaries and ward mission leaders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              If you should have access, ask a ward mission leader to confirm your missionary assignment or permissions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <MissionaryCalendarShell wardId={ward._id} access={access} />;
}
