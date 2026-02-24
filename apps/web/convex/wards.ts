import { v } from "convex/values";
import { query } from "./_generated/server";

export const listByStake = query({
  args: { stakeId: v.id("stakes") },
  handler: async (ctx, { stakeId }) => {
    return await ctx.db
      .query("wards")
      .withIndex("byStakeId", (q) => q.eq("stakeId", stakeId))
      .collect();
  },
});

export const getBySlug = query({
  args: { slug: v.string(), stakeId: v.optional(v.id("stakes")) },
  handler: async (ctx, { slug, stakeId }) => {
    if (stakeId) {
      return await ctx.db
        .query("wards")
        .withIndex("byStakeIdAndSlug", (q) =>
          q.eq("stakeId", stakeId).eq("slug", slug)
        )
        .unique();
    }
    return await ctx.db
      .query("wards")
      .withIndex("bySlug", (q) => q.eq("slug", slug))
      .unique();
  },
});
