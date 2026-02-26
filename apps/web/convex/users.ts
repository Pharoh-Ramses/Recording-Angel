import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

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

      // Delete member's posts (and poll data for poll-type posts)
      const posts = await ctx.db
        .query("posts")
        .withIndex("byAuthorId", (q) => q.eq("authorId", member._id))
        .collect();
      for (const post of posts) {
        if (post.type === "poll") {
          const pollOptions = await ctx.db
            .query("pollOptions")
            .withIndex("byPostId", (q) => q.eq("postId", post._id))
            .collect();
          for (const option of pollOptions) {
            const optionVotes = await ctx.db
              .query("pollVotes")
              .withIndex("byOptionId", (q) => q.eq("optionId", option._id))
              .collect();
            for (const v of optionVotes) {
              await ctx.db.delete(v._id);
            }
            await ctx.db.delete(option._id);
          }
        }
        await ctx.db.delete(post._id);
      }

      // Delete member's comments
      const comments = await ctx.db
        .query("comments")
        .withIndex("byAuthorId", (q) => q.eq("authorId", member._id))
        .collect();
      for (const comment of comments) {
        await ctx.db.delete(comment._id);
      }

      // Delete member's poll votes
      const pollVotes = await ctx.db
        .query("pollVotes")
        .filter((q) => q.eq(q.field("memberId"), member._id))
        .collect();
      for (const pv of pollVotes) {
        await ctx.db.delete(pv._id);
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

export const setPreferredLanguage = mutation({
  args: { language: v.string() },
  handler: async (ctx, { language }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, { preferredLanguage: language });
  },
});
