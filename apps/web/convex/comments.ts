import { v } from "convex/values";
import {
  mutation,
  query,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthenticatedMember, hasPermission } from "./lib/permissions";
import OpenAI from "openai";

// ── Public mutations ────────────────────────────────────────────────

export const create = mutation({
  args: {
    postId: v.id("posts"),
    content: v.string(),
    parentCommentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    // 1. Verify post exists and is approved
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    if (post.status !== "approved")
      throw new Error("Cannot comment on a post that is not approved");

    // 2. Authenticate member for the post's ward
    const member = await getAuthenticatedMember(ctx, post.wardId);
    if (!member) throw new Error("Not an active member of this ward");

    // 3. Check comment:create permission
    const canComment = await hasPermission(ctx, member._id, "comment:create");
    if (!canComment) throw new Error("Missing permission: comment:create");

    // 4. Validate parent comment if provided
    if (args.parentCommentId) {
      const parent = await ctx.db.get(args.parentCommentId);
      if (!parent) throw new Error("Parent comment not found");
      if (parent.postId !== args.postId)
        throw new Error("Parent comment does not belong to this post");
    }

    // 5. Determine initial status
    const canModerate = await hasPermission(
      ctx,
      member._id,
      "comment:moderate"
    );
    const status = canModerate ? "approved" : "pending_review";

    // 6. Insert the comment
    const commentId = await ctx.db.insert("comments", {
      postId: args.postId,
      parentCommentId: args.parentCommentId,
      authorId: member._id,
      wardId: post.wardId,
      stakeId: post.stakeId,
      content: args.content,
      status,
    });

    // 7. If pending, schedule AI screening
    if (status === "pending_review") {
      await ctx.scheduler.runAfter(0, internal.comments.aiScreen, {
        commentId,
      });
    }

    return commentId;
  },
});

export const remove = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, { commentId }) => {
    const comment = await ctx.db.get(commentId);
    if (!comment) throw new Error("Comment not found");

    const member = await getAuthenticatedMember(ctx, comment.wardId);
    if (!member) throw new Error("Not an active member of this ward");

    // Allow deletion if user is the author or has comment:moderate permission
    const isAuthor = comment.authorId === member._id;
    const canModerate = await hasPermission(
      ctx,
      member._id,
      "comment:moderate"
    );

    if (!isAuthor && !canModerate)
      throw new Error("Not authorized to delete this comment");

    // Delete child replies to avoid orphaned comments
    const childComments = await ctx.db
      .query("comments")
      .filter((q) => q.eq(q.field("parentCommentId"), commentId))
      .collect();
    for (const child of childComments) {
      await ctx.db.delete(child._id);
    }

    await ctx.db.delete(commentId);
  },
});

// ── Public queries ──────────────────────────────────────────────────

export const listByPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("byPostIdAndStatus", (q) =>
        q.eq("postId", postId).eq("status", "approved")
      )
      .order("asc")
      .collect();

    // Enrich with author data
    const enriched = await Promise.all(
      comments.map(async (comment) => {
        const member = await ctx.db.get(comment.authorId);
        const user = member ? await ctx.db.get(member.userId) : null;
        return { ...comment, author: user };
      })
    );

    return enriched;
  },
});

export const commentCount = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("byPostIdAndStatus", (q) =>
        q.eq("postId", postId).eq("status", "approved")
      )
      .collect();

    return comments.length;
  },
});

// ── Internal functions (AI moderation) ──────────────────────────────

export const getCommentForScreening = internalQuery({
  args: { commentId: v.id("comments") },
  handler: async (ctx, { commentId }) => {
    return await ctx.db.get(commentId);
  },
});

export const updateCommentStatus = internalMutation({
  args: {
    commentId: v.id("comments"),
    status: v.union(
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("pending_review")
    ),
    moderationNotes: v.optional(v.string()),
  },
  handler: async (ctx, { commentId, status, moderationNotes }) => {
    await ctx.db.patch(commentId, { status, moderationNotes });
  },
});

export const aiScreen = internalAction({
  args: { commentId: v.id("comments") },
  handler: async (ctx, { commentId }) => {
    // Fetch the comment
    const comment = await ctx.runQuery(
      internal.comments.getCommentForScreening,
      { commentId }
    );
    if (!comment || comment.status !== "pending_review") return;

    // Call OpenAI for screening
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              'Review this comment for appropriateness in a church community. Respond with JSON: {"decision": "approve" | "reject" | "needs_review", "reason": "brief explanation"}',
          },
          { role: "user", content: comment.content },
        ],
        response_format: { type: "json_object" },
        max_tokens: 200,
      });

      const result = JSON.parse(
        response.choices[0]?.message?.content ??
          '{"decision":"needs_review","reason":"Failed to parse AI response"}'
      );

      const decision = result.decision as string;
      const reason = result.reason as string;

      if (decision === "approve") {
        await ctx.runMutation(internal.comments.updateCommentStatus, {
          commentId,
          status: "approved",
          moderationNotes: `AI approved: ${reason}`,
        });
      } else if (decision === "reject") {
        await ctx.runMutation(internal.comments.updateCommentStatus, {
          commentId,
          status: "rejected",
          moderationNotes: `AI rejected: ${reason}`,
        });
      }
      // "needs_review" — stays as pending_review for manual queue
    } catch (error) {
      console.error(
        "AI comment moderation failed, leaving for manual review:",
        error
      );
      // On AI failure, leave as pending_review for manual review
    }
  },
});
