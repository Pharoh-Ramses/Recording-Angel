"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function MembersPage() {
  const params = useParams<{ stakeSlug: string; wardSlug: string }>();
  const ward = useQuery(api.wards.getBySlug, { slug: params.wardSlug });
  const pending = useQuery(api.members.pendingMembers, {
    wardId: ward?._id!,
  });
  const permissions = useQuery(api.roles.myPermissions, {
    wardId: ward?._id,
  });

  const approveMember = useMutation(api.members.approveMember);
  const rejectMember = useMutation(api.members.rejectMember);

  if (!ward) return null;

  const canApprove = permissions?.includes("member:approve");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Members</h1>

      {canApprove && pending && pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Pending Requests ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.map((member) => (
              <div
                key={member._id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {member.user?.imageUrl && (
                      <AvatarImage src={member.user.imageUrl} />
                    )}
                    <AvatarFallback>
                      {member.user?.name?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {member.user?.name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.user?.email}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => approveMember({ memberId: member._id })}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => rejectMember({ memberId: member._id })}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {canApprove && pending?.length === 0 && (
        <p className="text-muted-foreground">No pending requests.</p>
      )}
    </div>
  );
}
