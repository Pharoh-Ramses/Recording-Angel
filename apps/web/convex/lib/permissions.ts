import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export const ALL_PERMISSIONS = [
  "post:create",
  "post:publish_directly",
  "post:approve",
  "post:promote_to_stake",
  "member:approve",
  "member:view",
  "role:manage",
  "moderation:configure",
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export async function getMemberPermissions(
  ctx: QueryCtx,
  memberId: Id<"members">
): Promise<Set<Permission>> {
  const assignments = await ctx.db
    .query("memberRoles")
    .withIndex("byMemberId", (q) => q.eq("memberId", memberId))
    .collect();

  const permissions = new Set<Permission>();

  for (const assignment of assignments) {
    const role = await ctx.db.get(assignment.roleId);
    if (role) {
      for (const perm of role.permissions) {
        permissions.add(perm as Permission);
      }
    }
  }

  return permissions;
}

export async function hasPermission(
  ctx: QueryCtx,
  memberId: Id<"members">,
  permission: Permission
): Promise<boolean> {
  const perms = await getMemberPermissions(ctx, memberId);
  return perms.has(permission);
}

export async function requirePermission(
  ctx: QueryCtx | MutationCtx,
  memberId: Id<"members">,
  permission: Permission
): Promise<void> {
  const has = await hasPermission(ctx as QueryCtx, memberId, permission);
  if (!has) {
    throw new Error(`Missing permission: ${permission}`);
  }
}

export async function getAuthenticatedMember(
  ctx: QueryCtx,
  wardId?: Id<"wards">
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) return null;

  if (wardId) {
    const member = await ctx.db
      .query("members")
      .withIndex("byUserIdAndWardId", (q) =>
        q.eq("userId", user._id).eq("wardId", wardId)
      )
      .unique();
    return member?.status === "active" ? member : null;
  }

  // Return first active membership
  const members = await ctx.db
    .query("members")
    .withIndex("byUserId", (q) => q.eq("userId", user._id))
    .collect();
  return members.find((m) => m.status === "active") ?? null;
}
