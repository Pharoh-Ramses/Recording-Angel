"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";

export default function JoinPage() {
  const router = useRouter();
  const memberships = useQuery(api.members.myMembership);
  const stakes = useQuery(api.stakes.list);
  const requestToJoin = useMutation(api.members.requestToJoin);

  // If user has active membership, redirect to their ward
  const activeMembership = memberships?.find((m) => m.status === "active");

  useEffect(() => {
    if (activeMembership?.ward && activeMembership?.stake) {
      router.push(
        `/stake/${activeMembership.stake.slug}/ward/${activeMembership.ward.slug}`
      );
    }
  }, [activeMembership, router]);

  if (activeMembership) return null;

  // If user has pending membership, show waiting message
  const pendingMembership = memberships?.find((m) => m.status === "pending");

  async function handleJoin(wardId: Id<"wards">) {
    await requestToJoin({ wardId });
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-8 gap-6">
      <h1 className="text-3xl font-bold">Join a Ward</h1>

      {pendingMembership && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Request Pending</CardTitle>
            <CardDescription>
              Your request to join {pendingMembership.ward?.name} is awaiting
              approval from the bishop.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {!pendingMembership && stakes && (
        <div className="w-full max-w-md space-y-4">
          {stakes.map((stake) => (
            <StakeCard
              key={stake._id}
              stakeId={stake._id}
              stakeName={stake.name}
              onJoin={handleJoin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StakeCard({
  stakeId,
  stakeName,
  onJoin,
}: {
  stakeId: Id<"stakes">;
  stakeName: string;
  onJoin: (wardId: Id<"wards">) => Promise<void>;
}) {
  const wards = useQuery(api.wards.listByStake, { stakeId });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{stakeName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {wards?.map((ward) => (
          <div
            key={ward._id}
            className="flex items-center justify-between rounded-md border p-3"
          >
            <span>{ward.name}</span>
            <Button size="sm" onClick={() => onJoin(ward._id)}>
              Request to Join
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
