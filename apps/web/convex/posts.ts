import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  getAuthenticatedMember,
  hasPermission,
  requirePermission,
} from "./lib/permissions";
import { paginationOptsValidator } from "convex/server";

export const create = mutation({
  args: {
    wardId: v.id("wards"),
    type: v.union(
      v.literal("announcement"),
      v.literal("event"),
      v.literal("classifieds"),
      v.literal("poll")
    ),
    title: v.string(),
    content: v.string(),
    eventDate: v.optional(v.string()),
    eventLocation: v.optional(v.string()),
    pollOptions: v.optional(v.array(v.string())),
    pollCloseDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const member = await getAuthenticatedMember(ctx, args.wardId);
    if (!member) throw new Error("Not an active member of this ward");

    if (args.type === "poll") {
      if (!args.pollOptions || args.pollOptions.length < 2 || args.pollOptions.length > 6) {
        throw new Error("Polls require 2-6 options");
      }
    }

    const canPublishDirectly = await hasPermission(
      ctx,
      member._id,
      "post:publish_directly"
    );

    const postId = await ctx.db.insert("posts", {
      authorId: member._id,
      wardId: args.wardId,
      stakeId: member.stakeId,
      scope: "ward",
      type: args.type,
      title: args.title,
      content: args.content,
      status: canPublishDirectly ? "approved" : "pending_review",
      eventDate: args.eventDate,
      eventLocation: args.eventLocation,
      pollCloseDate: args.type === "poll" ? args.pollCloseDate : undefined,
    });

    // Insert poll options
    if (args.type === "poll" && args.pollOptions) {
      for (let i = 0; i < args.pollOptions.length; i++) {
        await ctx.db.insert("pollOptions", {
          postId,
          label: args.pollOptions[i],
          position: i,
        });
      }
    }

    // If post needs review, schedule AI moderation
    if (!canPublishDirectly) {
      await ctx.scheduler.runAfter(0, internal.moderation.aiScreen, {
        postId,
      });
    } else {
      await ctx.scheduler.runAfter(0, internal.translations.translatePost, {
        postId,
      });
    }

    return postId;
  },
});

export const listByWard = query({
  args: {
    wardId: v.id("wards"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { wardId, paginationOpts }) => {
    const results = await ctx.db
      .query("posts")
      .withIndex("byWardIdAndStatus", (q) =>
        q.eq("wardId", wardId).eq("status", "approved")
      )
      .order("desc")
      .paginate(paginationOpts);

    // Enrich with author data
    const enrichedPage = await Promise.all(
      results.page.map(async (post) => {
        const member = await ctx.db.get(post.authorId);
        const user = member ? await ctx.db.get(member.userId) : null;
        return { ...post, author: user };
      })
    );

    return { ...results, page: enrichedPage };
  },
});

export const listByStake = query({
  args: {
    stakeId: v.id("stakes"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { stakeId, paginationOpts }) => {
    const results = await ctx.db
      .query("posts")
      .withIndex("byStakeIdAndScopeAndStatus", (q) =>
        q
          .eq("stakeId", stakeId)
          .eq("scope", "stake")
          .eq("status", "approved")
      )
      .order("desc")
      .paginate(paginationOpts);

    const enrichedPage = await Promise.all(
      results.page.map(async (post) => {
        const member = await ctx.db.get(post.authorId);
        const user = member ? await ctx.db.get(member.userId) : null;
        const ward = await ctx.db.get(post.wardId);
        return { ...post, author: user, ward };
      })
    );

    return { ...results, page: enrichedPage };
  },
});

export const getById = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    if (!post || post.status !== "approved") return null;

    const member = await ctx.db.get(post.authorId);
    const user = member ? await ctx.db.get(member.userId) : null;
    const ward = await ctx.db.get(post.wardId);
    const stake = await ctx.db.get(post.stakeId);

    return { ...post, author: user, ward, stake };
  },
});

export const promoteToStake = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    if (!post) throw new Error("Post not found");

    const member = await getAuthenticatedMember(ctx, post.wardId);
    if (!member) throw new Error("Not a member");
    await requirePermission(ctx, member._id, "post:promote_to_stake");

    await ctx.db.patch(postId, { scope: "stake" });
  },
});

export const upcomingEvents = query({
  args: {
    wardId: v.optional(v.id("wards")),
    stakeId: v.optional(v.id("stakes")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { wardId, stakeId, limit = 5 }) => {
    const now = new Date().toISOString();

    let postsQuery;
    if (wardId) {
      postsQuery = ctx.db
        .query("posts")
        .withIndex("byWardIdAndStatus", (q) =>
          q.eq("wardId", wardId).eq("status", "approved")
        );
    } else if (stakeId) {
      postsQuery = ctx.db
        .query("posts")
        .withIndex("byStakeIdAndScopeAndStatus", (q) =>
          q.eq("stakeId", stakeId).eq("scope", "stake").eq("status", "approved")
        );
    } else {
      return [];
    }

    const allPosts = await postsQuery.collect();
    const events = allPosts
      .filter((p) => p.type === "event" && p.eventDate && p.eventDate >= now)
      .sort((a, b) => (a.eventDate! < b.eventDate! ? -1 : 1))
      .slice(0, limit);

    const enriched = await Promise.all(
      events.map(async (post) => {
        const member = await ctx.db.get(post.authorId);
        const user = member ? await ctx.db.get(member.userId) : null;
        return { ...post, author: user };
      })
    );

    return enriched;
  },
});
