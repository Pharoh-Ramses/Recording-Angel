import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { hasPermission } from "./lib/permissions";

export const requestToJoin = mutation({
  args: {
    wardId: v.id("wards"),
  },
  handler: async (ctx, { wardId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    // Check not already a member
    const existing = await ctx.db
      .query("members")
      .withIndex("byUserIdAndWardId", (q) =>
        q.eq("userId", user._id).eq("wardId", wardId)
      )
      .unique();
    if (existing) throw new Error("Already requested or member of this ward");

    const ward = await ctx.db.get(wardId);
    if (!ward) throw new Error("Ward not found");

    const memberId = await ctx.db.insert("members", {
      userId: user._id,
      wardId,
      stakeId: ward.stakeId,
      status: "pending",
    });

    // Assign default "member" role
    const memberRole = await ctx.db
      .query("roles")
      .withIndex("byWardId", (q) => q.eq("wardId", wardId))
      .filter((q) => q.eq(q.field("name"), "member"))
      .unique();

    if (memberRole) {
      await ctx.db.insert("memberRoles", {
        memberId,
        roleId: memberRole._id,
      });
    }

    return memberId;
  },
});

export const approveMember = mutation({
  args: {
    memberId: v.id("members"),
  },
  handler: async (ctx, { memberId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const targetMember = await ctx.db.get(memberId);
    if (!targetMember) throw new Error("Member not found");

    // Find the approver's membership in same ward
    const user = await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const approverMember = await ctx.db
      .query("members")
      .withIndex("byUserIdAndWardId", (q) =>
        q.eq("userId", user._id).eq("wardId", targetMember.wardId)
      )
      .unique();
    if (!approverMember || approverMember.status !== "active") {
      throw new Error("Not an active member of this ward");
    }

    const canApprove = await hasPermission(
      ctx,
      approverMember._id,
      "member:approve"
    );
    if (!canApprove) throw new Error("Missing permission: member:approve");

    await ctx.db.patch(memberId, { status: "active" });
  },
});

export const rejectMember = mutation({
  args: {
    memberId: v.id("members"),
  },
  handler: async (ctx, { memberId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const targetMember = await ctx.db.get(memberId);
    if (!targetMember) throw new Error("Member not found");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const approverMember = await ctx.db
      .query("members")
      .withIndex("byUserIdAndWardId", (q) =>
        q.eq("userId", user._id).eq("wardId", targetMember.wardId)
      )
      .unique();
    if (!approverMember || approverMember.status !== "active") {
      throw new Error("Not an active member of this ward");
    }

    const canApprove = await hasPermission(
      ctx,
      approverMember._id,
      "member:approve"
    );
    if (!canApprove) throw new Error("Missing permission: member:approve");

    await ctx.db.patch(memberId, { status: "inactive" });
  },
});

export const pendingMembers = query({
  args: { wardId: v.id("wards") },
  handler: async (ctx, { wardId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const pending = await ctx.db
      .query("members")
      .withIndex("byWardIdAndStatus", (q) =>
        q.eq("wardId", wardId).eq("status", "pending")
      )
      .collect();

    // Enrich with user data
    return Promise.all(
      pending.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        return { ...member, user };
      })
    );
  },
});

export const myMembership = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const memberships = await ctx.db
      .query("members")
      .withIndex("byUserId", (q) => q.eq("userId", user._id))
      .collect();

    // Enrich with ward and stake data
    return Promise.all(
      memberships.map(async (m) => {
        const ward = await ctx.db.get(m.wardId);
        const stake = await ctx.db.get(m.stakeId);
        return { ...m, ward, stake };
      })
    );
  },
});
