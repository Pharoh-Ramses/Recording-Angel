import { v } from "convex/values";
import { query } from "./_generated/server";
import { userMutation, stakeLeaderMutation } from "./lib/auth";

const languageValidator = v.union(v.literal("en"), v.literal("es"));

/**
 * Create a new ward under a stake.
 * Requires stake leader role (enforced by stakeLeaderMutation).
 * The creator automatically becomes a ward leader.
 */
export const create = stakeLeaderMutation({
  args: {
    name: v.string(),
    supportedLanguages: v.optional(v.array(languageValidator)),
  },
  handler: async (ctx, args) => {
    const wardId = await ctx.db.insert("wards", {
      name: args.name,
      stakeId: ctx.stakeId,
      supportedLanguages: args.supportedLanguages,
      createdBy: ctx.user._id,
    });

    // Make the creator a leader of this ward
    await ctx.db.insert("memberships", {
      userId: ctx.user._id,
      orgType: "ward",
      orgId: wardId,
      role: "leader",
    });

    return wardId;
  },
});

/**
 * List all wards under a stake.
 */
export const listByStake = query({
  args: { stakeId: v.id("stakes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("wards")
      .withIndex("by_stake", (q) => q.eq("stakeId", args.stakeId))
      .collect();
  },
});

/**
 * Search wards within a stake by name. Public query for member enrollment.
 * Returns all wards in the stake when query is empty (browse mode),
 * or filtered results using full-text search when query has content.
 */
export const searchByStake = query({
  args: { stakeId: v.id("stakes"), query: v.string() },
  handler: async (ctx, args) => {
    if (args.query.trim() === "") {
      return await ctx.db
        .query("wards")
        .withIndex("by_stake", (q) => q.eq("stakeId", args.stakeId))
        .collect();
    }
    return await ctx.db
      .query("wards")
      .withSearchIndex("search_name", (q) =>
        q.search("name", args.query).eq("stakeId", args.stakeId),
      )
      .take(20);
  },
});

/**
 * Get a single ward by ID, with effective languages resolved.
 * If the ward has no explicit languages, it inherits from its parent stake.
 */
export const get = query({
  args: { wardId: v.id("wards") },
  handler: async (ctx, args) => {
    const ward = await ctx.db.get(args.wardId);
    if (!ward) return null;

    const stake = await ctx.db.get(ward.stakeId);

    return {
      ...ward,
      effectiveLanguages:
        ward.supportedLanguages ?? stake?.supportedLanguages ?? ["en"],
    };
  },
});

/**
 * Set supported languages for a ward.
 * Pass `undefined` / omit to inherit from the parent stake.
 * Requires being a leader of either the ward or its parent stake.
 */
export const setLanguages = userMutation({
  args: {
    wardId: v.id("wards"),
    languages: v.optional(v.array(languageValidator)),
  },
  handler: async (ctx, args) => {
    const ward = await ctx.db.get(args.wardId);
    if (!ward) {
      throw new Error("Ward not found");
    }

    // Check if user is a leader of this ward
    const wardMembership = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) =>
        q.eq("orgType", "ward").eq("orgId", args.wardId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), ctx.user._id),
          q.eq(q.field("role"), "leader"),
        ),
      )
      .unique();

    // Check if user is a leader of the parent stake
    const stakeMembership = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) =>
        q.eq("orgType", "stake").eq("orgId", ward.stakeId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), ctx.user._id),
          q.eq(q.field("role"), "leader"),
        ),
      )
      .unique();

    if (!wardMembership && !stakeMembership) {
      throw new Error(
        "Forbidden: You must be a ward or stake leader to change languages",
      );
    }

    await ctx.db.patch(args.wardId, {
      supportedLanguages: args.languages,
    });
  },
});
