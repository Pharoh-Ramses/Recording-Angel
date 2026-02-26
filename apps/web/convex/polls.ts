import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedMember } from "./lib/permissions";

export const vote = mutation({
  args: {
    postId: v.id("posts"),
    optionId: v.id("pollOptions"),
  },
  handler: async (ctx, { postId, optionId }) => {
    const post = await ctx.db.get(postId);
    if (!post || post.status !== "approved" || post.type !== "poll") {
      throw new Error("Poll not found");
    }

    // Check poll is not expired
    if (post.pollCloseDate && new Date(post.pollCloseDate) < new Date()) {
      throw new Error("Poll is closed");
    }

    const member = await getAuthenticatedMember(ctx, post.wardId);
    if (!member) throw new Error("Not an active member of this ward");

    // Check option belongs to this post
    const option = await ctx.db.get(optionId);
    if (!option || option.postId !== postId) {
      throw new Error("Invalid option");
    }

    // Check if already voted
    const existingVote = await ctx.db
      .query("pollVotes")
      .withIndex("byPostIdAndMemberId", (q) =>
        q.eq("postId", postId).eq("memberId", member._id)
      )
      .unique();

    if (existingVote) {
      throw new Error("Already voted on this poll");
    }

    await ctx.db.insert("pollVotes", {
      postId,
      optionId,
      memberId: member._id,
    });
  },
});

export const getOptions = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const options = await ctx.db
      .query("pollOptions")
      .withIndex("byPostId", (q) => q.eq("postId", postId))
      .collect();

    return options.sort((a, b) => a.position - b.position);
  },
});

export const myVote = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const post = await ctx.db.get(postId);
    if (!post) return null;

    const member = await ctx.db
      .query("members")
      .withIndex("byUserIdAndWardId", (q) =>
        q.eq("userId", user._id).eq("wardId", post.wardId)
      )
      .unique();
    if (!member) return null;

    const vote = await ctx.db
      .query("pollVotes")
      .withIndex("byPostIdAndMemberId", (q) =>
        q.eq("postId", postId).eq("memberId", member._id)
      )
      .unique();

    return vote ? { optionId: vote.optionId } : null;
  },
});

export const getResults = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const options = await ctx.db
      .query("pollOptions")
      .withIndex("byPostId", (q) => q.eq("postId", postId))
      .collect();

    const sortedOptions = options.sort((a, b) => a.position - b.position);

    const results = await Promise.all(
      sortedOptions.map(async (option) => {
        const votes = await ctx.db
          .query("pollVotes")
          .withIndex("byOptionId", (q) => q.eq("optionId", option._id))
          .collect();
        return { ...option, voteCount: votes.length };
      })
    );

    const totalVotes = results.reduce((sum, r) => sum + r.voteCount, 0);

    return { options: results, totalVotes };
  },
});
