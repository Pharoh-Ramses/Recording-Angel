import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { userMutation, userQuery } from "./lib/auth";

const languageValidator = v.union(v.literal("en"), v.literal("es"));

/**
 * Create a new stake. Any authenticated user can create one.
 * The creator automatically becomes a stake leader via a membership record.
 */
export const create = userMutation({
  args: {
    name: v.string(),
    supportedLanguages: v.array(languageValidator),
  },
  handler: async (ctx, args) => {
    if (args.supportedLanguages.length === 0) {
      throw new Error("At least one supported language is required");
    }

    const stakeId = await ctx.db.insert("stakes", {
      name: args.name,
      supportedLanguages: args.supportedLanguages,
      createdBy: ctx.user._id,
    });

    // Make the creator a leader of this stake
    await ctx.db.insert("memberships", {
      userId: ctx.user._id,
      orgType: "stake",
      orgId: stakeId,
      role: "leader",
    });

    return stakeId;
  },
});

/**
 * List all stakes. Public query for discovery/search.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("stakes").collect();
  },
});

/**
 * Search stakes by name. Public query for member enrollment.
 * Returns all stakes when query is empty (browse mode),
 * or filtered results using full-text search when query has content.
 */
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    if (args.query.trim() === "") {
      return await ctx.db.query("stakes").collect();
    }
    return await ctx.db
      .query("stakes")
      .withSearchIndex("search_name", (q) => q.search("name", args.query))
      .take(20);
  },
});

/**
 * List stakes where the current user is a leader.
 */
export const listMyStakes = userQuery({
  args: {},
  handler: async (ctx) => {
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("orgType"), "stake"),
          q.eq(q.field("role"), "leader"),
        ),
      )
      .collect();

    const stakes = await Promise.all(
      memberships.map((m) => ctx.db.get(m.orgId as Id<"stakes">)),
    );

    return stakes.filter(Boolean);
  },
});

/**
 * Get a single stake by ID.
 */
export const get = query({
  args: { stakeId: v.id("stakes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.stakeId);
  },
});

/**
 * Set supported languages for a stake.
 * Only stake leaders can change this.
 */
export const setLanguages = userMutation({
  args: {
    stakeId: v.id("stakes"),
    languages: v.array(languageValidator),
  },
  handler: async (ctx, args) => {
    if (args.languages.length === 0) {
      throw new Error("At least one supported language is required");
    }

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) =>
        q.eq("orgType", "stake").eq("orgId", args.stakeId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), ctx.user._id),
          q.eq(q.field("role"), "leader"),
        ),
      )
      .unique();

    if (!membership) {
      throw new Error(
        "Forbidden: You must be a stake leader to change languages",
      );
    }

    await ctx.db.patch(args.stakeId, {
      supportedLanguages: args.languages,
    });
  },
});
