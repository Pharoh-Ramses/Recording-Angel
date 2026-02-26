import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";

// ISO code → English name mapping
export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  de: "German",
  zh: "Chinese",
  ko: "Korean",
  ja: "Japanese",
  tl: "Tagalog",
  to: "Tongan",
  sm: "Samoan",
};

// ---------------------------------------------------------------------------
// Internal helpers (called from actions via ctx.runQuery / ctx.runMutation)
// ---------------------------------------------------------------------------

export const getPostForTranslation = internalQuery({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    return await ctx.db.get(postId);
  },
});

export const getStakeLanguages = internalQuery({
  args: { stakeId: v.id("stakes") },
  handler: async (ctx, { stakeId }) => {
    const stake = await ctx.db.get(stakeId);
    return stake?.languages ?? [];
  },
});

export const getPollOptionsForTranslation = internalQuery({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const options = await ctx.db
      .query("pollOptions")
      .withIndex("byPostId", (q) => q.eq("postId", postId))
      .collect();
    return options.sort((a, b) => a.position - b.position);
  },
});

export const saveTranslation = internalMutation({
  args: {
    postId: v.id("posts"),
    language: v.string(),
    title: v.string(),
    content: v.string(),
    eventLocation: v.optional(v.string()),
    pollOptionLabels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("postTranslations")
      .withIndex("byPostIdAndLanguage", (q) =>
        q.eq("postId", args.postId).eq("language", args.language)
      )
      .unique();

    if (existing) {
      await ctx.db.replace(existing._id, args);
    } else {
      await ctx.db.insert("postTranslations", args);
    }
  },
});

// ---------------------------------------------------------------------------
// Translation action (runs async, e.g. scheduled after post approval)
// ---------------------------------------------------------------------------

export const translatePost = internalAction({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    // Fetch post
    const post = await ctx.runQuery(
      internal.translations.getPostForTranslation,
      { postId }
    );
    if (!post || post.status !== "approved") {
      return;
    }

    // Fetch configured languages for the stake
    const languages = await ctx.runQuery(
      internal.translations.getStakeLanguages,
      { stakeId: post.stakeId }
    );
    if (!languages || languages.length === 0) return;

    // Fetch poll options if this is a poll
    let pollOptionLabels: string[] = [];
    if (post.type === "poll") {
      const pollOptions = await ctx.runQuery(
        internal.translations.getPollOptionsForTranslation,
        { postId }
      );
      pollOptionLabels = pollOptions.map((o) => o.label);
    }

    const sourceLanguage = "en";

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    for (const targetLanguage of languages) {
      // Skip the source language — no translation needed
      if (targetLanguage === sourceLanguage) continue;

      try {
        const targetName =
          LANGUAGE_NAMES[targetLanguage] ?? targetLanguage;
        const sourceName =
          LANGUAGE_NAMES[sourceLanguage] ?? sourceLanguage;

        const systemPrompt = [
          `You are a professional translator. Translate the following content from ${sourceName} to ${targetName}.`,
          `Preserve all HTML tags exactly as they are — only translate the text content within them.`,
          `Return a JSON object with the following fields:`,
          `  - "title": the translated title`,
          `  - "content": the translated content (HTML preserved)`,
          ...(post.eventLocation
            ? [`  - "eventLocation": the translated event location`]
            : []),
          ...(pollOptionLabels.length > 0
            ? [`  - "pollOptionLabels": an array of translated poll option labels, in the same order as provided`]
            : []),
        ].join("\n");

        const userContent = [
          `Title: ${post.title}`,
          `Content: ${post.content}`,
          ...(post.eventLocation
            ? [`Event Location: ${post.eventLocation}`]
            : []),
          ...(pollOptionLabels.length > 0
            ? [`Poll Options: ${JSON.stringify(pollOptionLabels)}`]
            : []),
        ].join("\n\n");

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          response_format: { type: "json_object" },
          max_tokens: 2000,
        });

        const result = JSON.parse(
          response.choices[0]?.message?.content ?? "{}"
        );

        if (!result.title || !result.content) {
          console.error(
            `translatePost: incomplete response for ${targetLanguage}`,
            result
          );
          continue;
        }

        await ctx.runMutation(internal.translations.saveTranslation, {
          postId,
          language: targetLanguage,
          title: result.title,
          content: result.content,
          ...(result.eventLocation
            ? { eventLocation: result.eventLocation }
            : {}),
          ...(result.pollOptionLabels
            ? { pollOptionLabels: result.pollOptionLabels }
            : {}),
        });
      } catch (error) {
        console.error(
          `translatePost: failed for language ${targetLanguage}:`,
          error
        );
        // Continue with remaining languages
      }
    }
  },
});

// ---------------------------------------------------------------------------
// Backfill: translate all existing approved posts
// ---------------------------------------------------------------------------

export const backfillTranslations = internalAction({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.runQuery(
      internal.translations.listApprovedPosts
    );

    console.log(`Backfilling translations for ${posts.length} approved posts`);

    for (const post of posts) {
      try {
        await ctx.scheduler.runAfter(0, internal.translations.translatePost, {
          postId: post._id,
        });
      } catch (error) {
        console.error(`Failed to schedule translation for post ${post._id}:`, error);
      }
    }
  },
});

export const listApprovedPosts = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("posts")
      .filter((q) => q.eq(q.field("status"), "approved"))
      .collect();
  },
});

// ---------------------------------------------------------------------------
// Client-facing queries
// ---------------------------------------------------------------------------

export const getTranslation = query({
  args: {
    postId: v.id("posts"),
    language: v.string(),
  },
  handler: async (ctx, { postId, language }) => {
    return await ctx.db
      .query("postTranslations")
      .withIndex("byPostIdAndLanguage", (q) =>
        q.eq("postId", postId).eq("language", language)
      )
      .unique();
  },
});

export const listTranslations = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, { postId }) => {
    return await ctx.db
      .query("postTranslations")
      .withIndex("byPostId", (q) => q.eq("postId", postId))
      .collect();
  },
});
