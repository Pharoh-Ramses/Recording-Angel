import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  ALL_PERMISSIONS,
  getMemberPermissions,
  requirePermission,
  getAuthenticatedMember,
} from "./lib/permissions";

export const listForWard = query({
  args: { wardId: v.id("wards") },
  handler: async (ctx, { wardId }) => {
    return await ctx.db
      .query("roles")
      .withIndex("byWardId", (q) => q.eq("wardId", wardId))
      .collect();
  },
});

export const myPermissions = query({
  args: { wardId: v.optional(v.id("wards")) },
  handler: async (ctx, { wardId }) => {
    const member = await getAuthenticatedMember(ctx, wardId);
    if (!member) return [];
    const perms = await getMemberPermissions(ctx, member._id);
    return Array.from(perms);
  },
});

export const createCustomRole = mutation({
  args: {
    name: v.string(),
    wardId: v.id("wards"),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, { name, wardId, permissions }) => {
    const member = await getAuthenticatedMember(ctx, wardId);
    if (!member) throw new Error("Not a member of this ward");
    await requirePermission(ctx, member._id, "role:manage");

    // Validate permissions
    for (const p of permissions) {
      if (!ALL_PERMISSIONS.includes(p as any)) {
        throw new Error(`Invalid permission: ${p}`);
      }
    }

    return await ctx.db.insert("roles", {
      name,
      wardId,
      permissions,
      isSystem: false,
      level: "ward",
    });
  },
});

export const unassignRole = mutation({
  args: {
    memberId: v.id("members"),
    roleId: v.id("roles"),
  },
  handler: async (ctx, { memberId, roleId }) => {
    const member = await ctx.db.get(memberId);
    if (!member) throw new Error("Member not found");

    const admin = await getAuthenticatedMember(ctx, member.wardId);
    if (!admin) throw new Error("Not authenticated");
    await requirePermission(ctx, admin._id, "role:manage");

    const assignment = await ctx.db
      .query("memberRoles")
      .withIndex("byMemberId", (q) => q.eq("memberId", memberId))
      .filter((q) => q.eq(q.field("roleId"), roleId))
      .unique();

    if (assignment) {
      await ctx.db.delete(assignment._id);
    }
  },
});

export const assignRole = mutation({
  args: {
    memberId: v.id("members"),
    roleId: v.id("roles"),
  },
  handler: async (ctx, { memberId, roleId }) => {
    const targetMember = await ctx.db.get(memberId);
    if (!targetMember) throw new Error("Member not found");

    const assigner = await getAuthenticatedMember(ctx, targetMember.wardId);
    if (!assigner) throw new Error("Not a member of this ward");
    await requirePermission(ctx, assigner._id, "role:manage");

    // Check not already assigned
    const existing = await ctx.db
      .query("memberRoles")
      .withIndex("byMemberId", (q) => q.eq("memberId", memberId))
      .filter((q) => q.eq(q.field("roleId"), roleId))
      .unique();

    if (existing) throw new Error("Role already assigned");

    return await ctx.db.insert("memberRoles", { memberId, roleId });
  },
});
