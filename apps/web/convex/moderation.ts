import { v } from "convex/values";
import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthenticatedMember, requirePermission } from "./lib/permissions";
import OpenAI from "openai";
import { paginationOptsValidator } from "convex/server";

// AI screening action (runs async after post creation)
export const aiScreen = internalAction({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    // Fetch post
    const post = await ctx.runQuery(internal.moderation.getPostForScreening, {
      postId,
    });
    if (!post || post.status !== "pending_review") return;

    // Fetch moderation settings for this ward
    const settings = await ctx.runQuery(
      internal.moderation.getModerationSettings,
      { wardId: post.wardId }
    );

    // Check auto-approve
    if (settings?.autoApproveTypes.includes(post.type)) {
      await ctx.runMutation(internal.moderation.updatePostStatus, {
        postId,
        status: "approved",
        moderationNotes: "Auto-approved by type setting",
      });
      return;
    }

    // Call OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt =
      settings?.aiPrompt ??
      'Review this post for appropriateness in a church community. Respond with JSON: {"decision": "approve" | "reject" | "needs_review", "reason": "brief explanation"}';

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
          {
            role: "user",
            content: `Title: ${post.title}\n\nContent: ${post.content}\n\nPost type: ${post.type}`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 200,
      });

      const result = JSON.parse(
        response.choices[0]?.message?.content ?? '{"decision":"needs_review","reason":"Failed to parse AI response"}'
      );

      const decision = result.decision as string;
      const reason = result.reason as string;

      if (decision === "approve") {
        await ctx.runMutation(internal.moderation.updatePostStatus, {
          postId,
          status: "approved",
          moderationNotes: `AI approved: ${reason}`,
        });
      } else if (decision === "reject") {
        await ctx.runMutation(internal.moderation.updatePostStatus, {
          postId,
          status: "rejected",
          moderationNotes: `AI rejected: ${reason}`,
        });
      }
      // "needs_review" — stays as pending_review for manual queue
    } catch (error) {
      console.error("AI moderation failed, leaving for manual review:", error);
      // On AI failure, leave as pending_review for manual review
    }
  },
});

// Internal helpers
export const getPostForScreening = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    return await ctx.db.get(postId);
  },
});

export const getModerationSettings = query({
  args: { wardId: v.id("wards") },
  handler: async (ctx, { wardId }) => {
    return await ctx.db
      .query("moderationSettings")
      .withIndex("byWardId", (q) => q.eq("wardId", wardId))
      .unique();
  },
});

export const updatePostStatus = internalMutation({
  args: {
    postId: v.id("posts"),
    status: v.union(
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("pending_review")
    ),
    moderationNotes: v.optional(v.string()),
  },
  handler: async (ctx, { postId, status, moderationNotes }) => {
    await ctx.db.patch(postId, { status, moderationNotes });
  },
});

// Moderation queue (for manual review)
export const pendingPosts = query({
  args: {
    wardId: v.id("wards"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { wardId, paginationOpts }) => {
    const results = await ctx.db
      .query("posts")
      .withIndex("byWardIdAndStatus", (q) =>
        q.eq("wardId", wardId).eq("status", "pending_review")
      )
      .order("desc")
      .paginate(paginationOpts);

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

// Manual moderation actions
export const approvePost = mutation({
  args: {
    postId: v.id("posts"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { postId, notes }) => {
    const post = await ctx.db.get(postId);
    if (!post) throw new Error("Post not found");

    const member = await getAuthenticatedMember(ctx, post.wardId);
    if (!member) throw new Error("Not a member");
    await requirePermission(ctx, member._id, "post:approve");

    await ctx.db.patch(postId, {
      status: "approved",
      moderationNotes: notes ?? "Manually approved",
    });
  },
});

export const rejectPost = mutation({
  args: {
    postId: v.id("posts"),
    notes: v.string(),
  },
  handler: async (ctx, { postId, notes }) => {
    const post = await ctx.db.get(postId);
    if (!post) throw new Error("Post not found");

    const member = await getAuthenticatedMember(ctx, post.wardId);
    if (!member) throw new Error("Not a member");
    await requirePermission(ctx, member._id, "post:approve");

    await ctx.db.patch(postId, {
      status: "rejected",
      moderationNotes: notes,
    });
  },
});

// Moderation settings management
export const getSettings = query({
  args: { wardId: v.id("wards") },
  handler: async (ctx, { wardId }) => {
    return await ctx.db
      .query("moderationSettings")
      .withIndex("byWardId", (q) => q.eq("wardId", wardId))
      .unique();
  },
});

export const updateSettings = mutation({
  args: {
    wardId: v.id("wards"),
    aiPrompt: v.optional(v.string()),
    autoApproveTypes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { wardId, aiPrompt, autoApproveTypes }) => {
    const member = await getAuthenticatedMember(ctx, wardId);
    if (!member) throw new Error("Not a member");
    await requirePermission(ctx, member._id, "moderation:configure");

    const settings = await ctx.db
      .query("moderationSettings")
      .withIndex("byWardId", (q) => q.eq("wardId", wardId))
      .unique();

    if (!settings) throw new Error("Moderation settings not found");

    const updates: Record<string, unknown> = {};
    if (aiPrompt !== undefined) updates.aiPrompt = aiPrompt;
    if (autoApproveTypes !== undefined)
      updates.autoApproveTypes = autoApproveTypes;

    await ctx.db.patch(settings._id, updates);
  },
});
