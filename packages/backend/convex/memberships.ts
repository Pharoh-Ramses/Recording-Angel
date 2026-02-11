import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { userMutation, userQuery } from "./lib/auth";

/**
 * Join a ward as a member. Atomically creates both ward and
 * parent stake memberships (if not already present).
 * Prevents duplicate memberships.
 */
export const joinWard = userMutation({
  args: { wardId: v.id("wards") },
  handler: async (ctx, args) => {
    const ward = await ctx.db.get(args.wardId);
    if (!ward) {
      throw new Error("Ward not found");
    }

    // Check for existing ward membership (member or leader)
    const existingWard = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q
          .eq("userId", ctx.user._id)
          .eq("orgType", "ward")
          .eq("orgId", args.wardId),
      )
      .unique();

    if (existingWard) {
      if (existingWard.role === "leader") {
        throw new Error("You are already a leader of this ward");
      }
      throw new Error("You are already a member of this ward");
    }

    // Create ward membership
    await ctx.db.insert("memberships", {
      userId: ctx.user._id,
      orgType: "ward",
      orgId: args.wardId,
      role: "member",
    });

    // Auto-join parent stake if not already a member
    const existingStake = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q
          .eq("userId", ctx.user._id)
          .eq("orgType", "stake")
          .eq("orgId", ward.stakeId),
      )
      .unique();

    if (!existingStake) {
      await ctx.db.insert("memberships", {
        userId: ctx.user._id,
        orgType: "stake",
        orgId: ward.stakeId,
        role: "member",
      });
    }

    return { wardId: args.wardId, stakeId: ward.stakeId };
  },
});

/**
 * Leave a ward. Deletes the ward membership.
 * Leaders cannot leave — they must transfer leadership first.
 */
export const leaveWard = userMutation({
  args: { wardId: v.id("wards") },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q
          .eq("userId", ctx.user._id)
          .eq("orgType", "ward")
          .eq("orgId", args.wardId),
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this ward");
    }

    if (membership.role === "leader") {
      throw new Error(
        "Leaders cannot leave a ward. Transfer leadership first.",
      );
    }

    await ctx.db.delete(membership._id);
  },
});

/**
 * Get all memberships for the current user with resolved org details.
 * Returns ward memberships with parent stake info, and stake memberships.
 */
export const myMemberships = userQuery({
  args: {},
  handler: async (ctx) => {
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect();

    const results = await Promise.all(
      memberships.map(async (m) => {
        if (m.orgType === "stake") {
          const stake = await ctx.db.get(m.orgId as Id<"stakes">);
          return { ...m, org: stake, parentStake: null };
        } else {
          const ward = await ctx.db.get(m.orgId as Id<"wards">);
          const stake = ward ? await ctx.db.get(ward.stakeId) : null;
          return { ...m, org: ward, parentStake: stake };
        }
      }),
    );

    // Filter out memberships where the org no longer exists
    return results.filter((r) => r.org !== null);
  },
});
