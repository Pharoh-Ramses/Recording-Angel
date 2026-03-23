"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams } from "next/navigation";
import { type Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Suspense, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ALL_PERMISSIONS } from "@/convex/lib/permissions";

const PERMISSION_LABELS: Record<string, string> = {
  "post:create": "Create posts",
  "post:publish_directly": "Publish without review",
  "post:approve": "Approve posts",
  "post:promote_to_stake": "Promote to stake",
  "member:approve": "Approve members",
  "member:view": "View members",
  "role:manage": "Manage roles",
  "moderation:configure": "Configure moderation",
  "comment:create": "Create comments",
  "comment:moderate": "Moderate comments",
  "live:manage": "Manage live sessions",
};

type ActiveMemberRole = {
  _id: Id<"roles">;
  name: string;
  isSystem: boolean;
};

type AssignableRole = Doc<"roles">;

function isActiveMemberRole(role: ActiveMemberRole | null): role is ActiveMemberRole {
  return role !== null;
}

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
  const [expandedMemberId, setExpandedMemberId] =
    useState<Id<"members"> | null>(null);

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
                className="rounded-lg border border-border overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() =>
                    setExpandedMemberId(
                      expandedMemberId === member._id ? null : member._id,
                    )
                  }
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
                  <div
                    className="flex items-center gap-2 flex-wrap justify-end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {member.roles
                      .filter(isActiveMemberRole)
                      .filter(
                        (role) => role.name?.startsWith("custom:") !== true,
                      )
                      .map((role) => (
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
                        currentRoleIds={member.roles
                          .filter(isActiveMemberRole)
                          .map((r) => r._id)}
                        allRoles={roles.filter(
                          (r) => !r.name?.startsWith("custom:"),
                        )}
                        onAssign={(roleId) =>
                          assignRole({ memberId: member._id, roleId })
                        }
                      />
                    )}
                  </div>
                </div>
                {expandedMemberId === member._id && (
                  <PermissionPanel memberId={member._id} wardId={wardId} />
                )}
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
  allRoles: AssignableRole[];
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

function PermissionPanel({
  memberId,
  wardId,
}: {
  memberId: Id<"members">;
  wardId: Id<"wards">;
}) {
  const details = useQuery(api.roles.memberPermissionDetails, { memberId });
  const setPermissions = useMutation(api.roles.setMemberPermissions);
  const permissions = useQuery(api.roles.myPermissions, { wardId });
  const canManage = permissions?.includes("role:manage");

  if (!details)
    return (
      <div className="px-3 py-4 text-sm text-muted-foreground">Loading...</div>
    );

  const systemPermSet = new Set(
    details.systemPermissions.map((sp) => sp.permission),
  );
  const customPermSet = new Set(details.customPermissions);

  const systemPermSource = new Map<string, string>();
  for (const sp of details.systemPermissions) {
    if (!systemPermSource.has(sp.permission)) {
      systemPermSource.set(sp.permission, sp.fromRole);
    }
  }

  async function handleToggle(perm: string, checked: boolean) {
    const newCustom = checked
      ? [...details!.customPermissions, perm]
      : details!.customPermissions.filter((p) => p !== perm);
    await setPermissions({ memberId, permissions: newCustom });
  }

  return (
    <div className="px-3 py-4 border-t border-border bg-muted/30">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Permissions
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ALL_PERMISSIONS.map((perm) => {
          const fromSystem = systemPermSet.has(perm);
          const fromCustom = customPermSet.has(perm);
          const isChecked = fromSystem || fromCustom;
          const isDisabled = fromSystem || !canManage;
          const source = systemPermSource.get(perm);

          return (
            <label
              key={perm}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                isDisabled
                  ? "opacity-60 cursor-default"
                  : "cursor-pointer hover:bg-accent/50",
              )}
            >
              <Checkbox
                checked={isChecked}
                disabled={isDisabled}
                onCheckedChange={(checked) => handleToggle(perm, !!checked)}
              />
              <span>{PERMISSION_LABELS[perm] ?? perm}</span>
              {source && (
                <span className="text-xs text-muted-foreground ml-auto">
                  from {source}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
