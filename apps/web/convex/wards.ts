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
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("wards")
      .withIndex("bySlug", (q) => q.eq("slug", slug))
      .unique();
  },
});
