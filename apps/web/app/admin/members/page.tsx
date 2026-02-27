"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Suspense } from "react";

export default function AdminMembersPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
      <AdminMembersContent />
    </Suspense>
  );
}

function AdminMembersContent() {
  const searchParams = useSearchParams();
  const wardId = searchParams.get("ward") as Id<"wards"> | null;

  if (!wardId) {
    return <p className="text-muted-foreground">No ward selected.</p>;
  }

  return <MembersContent wardId={wardId} />;
}

function MembersContent({ wardId }: { wardId: Id<"wards"> }) {
  const pending = useQuery(api.members.pendingMembers, { wardId });
  const active = useQuery(api.members.listActive, { wardId });
  const roles = useQuery(api.roles.listForWard, { wardId });
  const permissions = useQuery(api.roles.myPermissions, { wardId });

  const approveMember = useMutation(api.members.approveMember);
  const rejectMember = useMutation(api.members.rejectMember);
  const assignRole = useMutation(api.roles.assignRole);
  const unassignRole = useMutation(api.roles.unassignRole);

  const canManageRoles = permissions?.includes("role:manage");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Members</h1>

      {/* Pending Requests */}
      {pending && pending.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Pending Requests ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((member) => (
              <div
                key={member._id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.user?.imageUrl} />
                    <AvatarFallback>
                      {member.user?.name?.[0] ?? "?"}
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
          </div>
        </section>
      )}

      {/* Active Members */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          Active Members {active ? `(${active.length})` : ""}
        </h2>
        {active === undefined ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : active.length === 0 ? (
          <p className="text-muted-foreground">No active members.</p>
        ) : (
          <div className="space-y-2">
            {active.map((member) => (
              <div
                key={member._id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.user?.imageUrl} />
                    <AvatarFallback>
                      {member.user?.name?.[0] ?? "?"}
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
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {member.roles.map((role: any) => (
                    <Badge
                      key={role._id}
                      variant={role.isSystem ? "secondary" : "outline"}
                      className="gap-1"
                    >
                      {role.name}
                      {canManageRoles && !role.isSystem && (
                        <button
                          onClick={() =>
                            unassignRole({
                              memberId: member._id,
                              roleId: role._id,
                            })
                          }
                          className="ml-0.5 hover:text-destructive"
                        >
                          x
                        </button>
                      )}
                    </Badge>
                  ))}
                  {canManageRoles && roles && (
                    <RoleAssigner
                      currentRoleIds={member.roles.map((r: any) => r._id)}
                      allRoles={roles}
                      onAssign={(roleId) =>
                        assignRole({ memberId: member._id, roleId })
                      }
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RoleAssigner({
  currentRoleIds,
  allRoles,
  onAssign,
}: {
  currentRoleIds: Id<"roles">[];
  allRoles: any[];
  onAssign: (roleId: Id<"roles">) => void;
}) {
  const available = allRoles.filter((r) => !currentRoleIds.includes(r._id));
  if (available.length === 0) return null;

  return (
    <Select onValueChange={(val) => onAssign(val as Id<"roles">)}>
      <SelectTrigger className="w-28 h-7 text-xs">
        <SelectValue placeholder="Add role" />
      </SelectTrigger>
      <SelectContent>
        {available.map((role) => (
          <SelectItem key={role._id} value={role._id}>
            {role.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
