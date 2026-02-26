import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getAuthenticatedMember,
  requirePermission,
  hasPermission,
} from "./lib/permissions";

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

export const getPinnedPolls = query({
  args: { wardId: v.id("wards") },
  handler: async (ctx, { wardId }) => {
    const approvedPosts = await ctx.db
      .query("posts")
      .withIndex("byWardIdAndStatus", (q) =>
        q.eq("wardId", wardId).eq("status", "approved")
      )
      .collect();

    const pinned = approvedPosts.filter(
      (p) => p.type === "poll" && p.isPinned === true
    );

    return Promise.all(
      pinned.map(async (post) => {
        const member = await ctx.db.get(post.authorId);
        const user = member
          ? await ctx.db
              .query("users")
              .filter((q) => q.eq(q.field("_id"), member.userId))
              .unique()
          : null;

        return {
          ...post,
          author: user ? { name: user.name, imageUrl: user.imageUrl } : null,
        };
      })
    );
  },
});

export const pinPoll = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    if (!post || post.type !== "poll" || post.status !== "approved") {
      throw new Error("Post is not an approved poll");
    }

    const member = await getAuthenticatedMember(ctx, post.wardId);
    if (!member) throw new Error("Not authenticated");
    await requirePermission(ctx, member._id, "post:approve");

    // Enforce max 3 pinned per ward
    const approvedPosts = await ctx.db
      .query("posts")
      .withIndex("byWardIdAndStatus", (q) =>
        q.eq("wardId", post.wardId).eq("status", "approved")
      )
      .collect();

    const pinnedCount = approvedPosts.filter(
      (p) => p.type === "poll" && p.isPinned === true
    ).length;

    if (pinnedCount >= 3) {
      throw new Error("Maximum of 3 pinned polls per ward");
    }

    await ctx.db.patch(postId, { isPinned: true });
  },
});

export const unpinPoll = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    if (!post) throw new Error("Post not found");

    const member = await getAuthenticatedMember(ctx, post.wardId);
    if (!member) throw new Error("Not authenticated");
    await requirePermission(ctx, member._id, "post:approve");

    await ctx.db.patch(postId, { isPinned: false });
  },
});

export const listApprovedForWard = query({
  args: { wardId: v.id("wards") },
  handler: async (ctx, { wardId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const member = await ctx.db
      .query("members")
      .withIndex("byUserIdAndWardId", (q) =>
        q.eq("userId", user._id).eq("wardId", wardId)
      )
      .unique();
    if (!member || member.status !== "active") {
      throw new Error("Not an active member");
    }

    const hasPerm = await hasPermission(ctx, member._id, "post:approve");
    if (!hasPerm) throw new Error("Missing permission: post:approve");

    const approvedPosts = await ctx.db
      .query("posts")
      .withIndex("byWardIdAndStatus", (q) =>
        q.eq("wardId", wardId).eq("status", "approved")
      )
      .collect();

    const polls = approvedPosts.filter((p) => p.type === "poll");

    return Promise.all(
      polls.map(async (post) => {
        const authorMember = await ctx.db.get(post.authorId);
        const authorUser = authorMember
          ? await ctx.db
              .query("users")
              .filter((q) => q.eq(q.field("_id"), authorMember.userId))
              .unique()
          : null;

        // Get total votes
        const options = await ctx.db
          .query("pollOptions")
          .withIndex("byPostId", (q) => q.eq("postId", post._id))
          .collect();

        let totalVotes = 0;
        for (const option of options) {
          const votes = await ctx.db
            .query("pollVotes")
            .withIndex("byOptionId", (q) => q.eq("optionId", option._id))
            .collect();
          totalVotes += votes.length;
        }

        return {
          ...post,
          author: authorUser
            ? { name: authorUser.name, imageUrl: authorUser.imageUrl }
            : null,
          totalVotes,
        };
      })
    );
  },
});
