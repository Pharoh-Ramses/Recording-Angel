import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

export const upsertFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
        imageUrl: args.imageUrl,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", args);
  },
});

export const deleteByClerkId = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (!user) return;

    // Find all memberships for this user
    const members = await ctx.db
      .query("members")
      .withIndex("byUserId", (q) => q.eq("userId", user._id))
      .collect();

    for (const member of members) {
      // Delete member's role assignments
      const roles = await ctx.db
        .query("memberRoles")
        .withIndex("byMemberId", (q) => q.eq("memberId", member._id))
        .collect();
      for (const role of roles) {
        await ctx.db.delete(role._id);
      }

      // Delete member's posts
      const posts = await ctx.db
        .query("posts")
        .withIndex("byAuthorId", (q) => q.eq("authorId", member._id))
        .collect();
      for (const post of posts) {
        await ctx.db.delete(post._id);
      }

      // Delete the membership record
      await ctx.db.delete(member._id);
    }

    await ctx.db.delete(user._id);
  },
});

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});
