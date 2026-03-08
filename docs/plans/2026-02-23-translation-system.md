# Translation System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-translate approved posts into a stake's configured languages so members can read content in their preferred language.

**Architecture:** When a post is approved (AI or manual), an async Convex action calls OpenAI to translate the title, content, and event location into each target language. Translations are stored in a `postTranslations` table, one row per post+language. The client reads the user's `preferredLanguage` from the `users` table and swaps in the translated content when available, with a toggle to view the original.

**Tech Stack:** Convex (schema, internal actions, queries, mutations), OpenAI `gpt-4o-mini` (already installed), React client components, Next.js App Router.

---

## Task 1: Schema — Add `postTranslations` table and `preferredLanguage` field

**Files:**
- Modify: `apps/web/convex/schema.ts`

**Step 1: Add `postTranslations` table and user `preferredLanguage`**

In `apps/web/convex/schema.ts`, add a new table after the `posts` table definition and add `preferredLanguage` to `users`:

```ts
// In the users table, add preferredLanguage:
users: defineTable({
  clerkId: v.string(),
  name: v.string(),
  email: v.string(),
  imageUrl: v.optional(v.string()),
  preferredLanguage: v.optional(v.string()),
}).index("byClerkId", ["clerkId"]),
```

```ts
// New table — add after moderationSettings:
postTranslations: defineTable({
  postId: v.id("posts"),
  language: v.string(), // ISO 639-1 code, e.g. "es", "pt"
  title: v.string(),
  content: v.string(), // HTML from OpenAI translation
  eventLocation: v.optional(v.string()),
})
  .index("byPostId", ["postId"])
  .index("byPostIdAndLanguage", ["postId", "language"]),
```

**Step 2: Verify schema syncs**

Run: `cd apps/web && npx convex dev --once`
Expected: Schema push succeeds. New table `postTranslations` created. `users` table updated.

**Step 3: Commit**

```bash
git add apps/web/convex/schema.ts
git commit -m "feat: add postTranslations table and user preferredLanguage field"
```

---

## Task 2: Backend — Translation action

**Files:**
- Create: `apps/web/convex/translations.ts`

**Step 1: Create the translation module**

Create `apps/web/convex/translations.ts` with:

1. `translatePost` — `internalAction` that takes a `postId`, fetches the post and stake languages, calls OpenAI for each target language (skipping the source language), and stores results.
2. `getPostForTranslation` — `internalQuery` helper to fetch post data.
3. `getStakeLanguages` — `internalQuery` helper to get the stake's `languages` array.
4. `saveTranslation` — `internalMutation` to insert/update a translation row.

```ts
import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";

// --- Internal helpers ---

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

export const saveTranslation = internalMutation({
  args: {
    postId: v.id("posts"),
    language: v.string(),
    title: v.string(),
    content: v.string(),
    eventLocation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Upsert: delete existing translation for this post+language, then insert
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

// --- Main translation action ---

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  de: "German",
  zh: "Chinese (Simplified)",
  ko: "Korean",
  ja: "Japanese",
  tl: "Tagalog",
  to: "Tongan",
  sm: "Samoan",
};

export const translatePost = internalAction({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.runQuery(
      internal.translations.getPostForTranslation,
      { postId }
    );
    if (!post || post.status !== "approved") return;

    const languages = await ctx.runQuery(
      internal.translations.getStakeLanguages,
      { stakeId: post.stakeId }
    );

    // Default source language to English if not set
    const sourceLanguage = "en";

    // Filter to only target languages (skip the source language)
    const targetLanguages = languages.filter((l: string) => l !== sourceLanguage);
    if (targetLanguages.length === 0) return;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    for (const lang of targetLanguages) {
      const langName = LANGUAGE_NAMES[lang] ?? lang;

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a translator for a church community app. Translate the following content from ${LANGUAGE_NAMES[sourceLanguage] ?? sourceLanguage} to ${langName}. The content field contains HTML — preserve all HTML tags exactly and only translate the text content within them. Respond with JSON: {"title": "translated title", "content": "translated HTML content"${post.eventLocation ? ', "eventLocation": "translated location"' : ""}}`,
            },
            {
              role: "user",
              content: JSON.stringify({
                title: post.title,
                content: post.content,
                ...(post.eventLocation
                  ? { eventLocation: post.eventLocation }
                  : {}),
              }),
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 2000,
        });

        const result = JSON.parse(
          response.choices[0]?.message?.content ?? "{}"
        );

        if (result.title && result.content) {
          await ctx.runMutation(internal.translations.saveTranslation, {
            postId,
            language: lang,
            title: result.title,
            content: result.content,
            eventLocation: result.eventLocation,
          });
        }
      } catch (error) {
        console.error(`Translation to ${langName} failed for post ${postId}:`, error);
        // Continue with other languages — don't block on single failure
      }
    }
  },
});

// --- Client-facing queries ---

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
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    return await ctx.db
      .query("postTranslations")
      .withIndex("byPostId", (q) => q.eq("postId", postId))
      .collect();
  },
});
```

**Step 2: Verify the file compiles**

Run: `cd apps/web && npx convex dev --once`
Expected: Functions sync without errors.

**Step 3: Commit**

```bash
git add apps/web/convex/translations.ts
git commit -m "feat: add translation action with OpenAI and client queries"
```

---

## Task 3: Backend — Trigger translations after post approval

**Files:**
- Modify: `apps/web/convex/moderation.ts` (3 locations: AI approve, manual approve)
- Modify: `apps/web/convex/posts.ts` (direct-publish path)

**Step 1: Add translation trigger to AI moderation approval**

In `apps/web/convex/moderation.ts`, inside the `aiScreen` action, after the `decision === "approve"` block (around line 67), schedule translation:

```ts
// After updating status to approved:
await ctx.scheduler.runAfter(0, internal.translations.translatePost, {
  postId,
});
```

Add the same after the auto-approve block (around line 31).

**Step 2: Add translation trigger to manual approval**

In `apps/web/convex/moderation.ts`, in the `approvePost` mutation (around line 165), after `ctx.db.patch(postId, ...)`, schedule translation. Since mutations can't call `ctx.scheduler.runAfter` for internal actions directly, wrap it:

Actually — Convex mutations **can** call `ctx.scheduler.runAfter` for internal actions. Add after the patch:

```ts
await ctx.scheduler.runAfter(0, internal.translations.translatePost, {
  postId,
});
```

**Step 3: Add translation trigger for direct-publish posts**

In `apps/web/convex/posts.ts`, in the `create` mutation, after the `if (!canPublishDirectly)` block, add an else clause to schedule translation for directly-published posts:

```ts
if (!canPublishDirectly) {
  await ctx.scheduler.runAfter(0, internal.moderation.aiScreen, {
    postId,
  });
} else {
  // Directly published — translate immediately
  await ctx.scheduler.runAfter(0, internal.translations.translatePost, {
    postId,
  });
}
```

**Step 4: Add the import**

Add `import { internal } from "./_generated/api";` to `moderation.ts` (already present) and ensure `posts.ts` has it (already present).

**Step 5: Verify**

Run: `cd apps/web && npx convex dev --once`
Expected: Functions sync without errors.

**Step 6: Commit**

```bash
git add apps/web/convex/moderation.ts apps/web/convex/posts.ts
git commit -m "feat: trigger post translation after approval"
```

---

## Task 4: Backend — User language preference mutation

**Files:**
- Modify: `apps/web/convex/users.ts`

**Step 1: Add `setPreferredLanguage` mutation**

Add to `apps/web/convex/users.ts`:

```ts
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
```

Add `mutation` to the import from `./_generated/server` (currently only imports `internalMutation` and `query`).

**Step 2: Verify**

Run: `cd apps/web && npx convex dev --once`
Expected: Functions sync without errors.

**Step 3: Commit**

```bash
git add apps/web/convex/users.ts
git commit -m "feat: add setPreferredLanguage mutation"
```

---

## Task 5: UI — Language selector in left sidebar

**Files:**
- Modify: `apps/web/components/left-sidebar.tsx`

**Step 1: Add language selector**

In `left-sidebar.tsx`, after the "Admin" section and before the spacer `<div className="flex-1" />`, add a language selector section. This reads the stake's `languages` array and the user's `preferredLanguage`, and lets them pick.

Add these imports at the top:

```ts
import { useMutation } from "convex/react";
import { Globe } from "lucide-react";
```

Add `Globe` to the existing lucide-react import. Add `useMutation` to the existing convex/react import (which currently only imports `useQuery`).

Inside the component, add after the permissions query:

```ts
const setPreferredLanguage = useMutation(api.users.setPreferredLanguage);
```

Then, before the spacer div, add:

```tsx
{/* Language selector */}
{stake?.languages && stake.languages.length > 1 && (
  <div className="px-2 pt-6">
    <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      Language
    </p>
    <nav className="space-y-0.5">
      {stake.languages.map((lang) => {
        const isActive = (currentUser?.preferredLanguage ?? "en") === lang;
        return (
          <button
            key={lang}
            onClick={() => setPreferredLanguage({ language: lang })}
            className={cn(
              "flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            <Globe className="h-4 w-4" />
            {LANGUAGE_LABELS[lang] ?? lang.toUpperCase()}
          </button>
        );
      })}
    </nav>
  </div>
)}
```

Add a constant at the top of the file (after `FEED_FILTERS`):

```ts
const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
  zh: "中文",
  ko: "한국어",
  ja: "日本語",
  tl: "Tagalog",
  to: "Lea fakatonga",
  sm: "Gagana Samoa",
};
```

**Step 2: Verify**

Run: `bun run dev` (in a separate terminal)
Navigate to a ward page. If the stake has `["en", "es"]`, you should see a "Language" section with "English" and "Español" buttons.

**Step 3: Commit**

```bash
git add apps/web/components/left-sidebar.tsx
git commit -m "feat: add language selector to left sidebar"
```

---

## Task 6: UI — PostCard shows translated content

**Files:**
- Modify: `apps/web/components/post-card.tsx`
- Modify: `apps/web/components/feed.tsx`

**Step 1: Update Feed to pass postId and user language**

In `apps/web/components/feed.tsx`, the feed already passes post data to `PostCard`. Update to also pass `postId` (needed for translation lookup) and the user's preferred language.

Add to imports:

```ts
import { useQuery } from "convex/react";
```

(Currently only imports `usePaginatedQuery`.)

Inside the `Feed` component, add:

```ts
const currentUser = useQuery(api.users.currentUser);
const preferredLanguage = currentUser?.preferredLanguage;
```

Update the `PostCard` rendering to pass the new props:

```tsx
<PostCard
  key={post._id}
  postId={post._id}
  title={post.title}
  content={post.content}
  type={post.type}
  author={post.author ?? null}
  ward={"ward" in post ? (post as any).ward : undefined}
  createdAt={post._creationTime}
  eventDate={post.eventDate}
  eventLocation={post.eventLocation}
  preferredLanguage={preferredLanguage}
/>
```

**Step 2: Update PostCard to fetch and display translations**

In `apps/web/components/post-card.tsx`, update the component to optionally fetch a translation and display it.

Add imports:

```ts
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { Globe } from "lucide-react";
```

Update `PostCardProps`:

```ts
interface PostCardProps {
  postId: Id<"posts">;
  title: string;
  content: string;
  type: string;
  author: { name: string; imageUrl?: string } | null;
  ward?: { name: string } | null;
  createdAt: number;
  eventDate?: string;
  eventLocation?: string;
  preferredLanguage?: string;
}
```

Inside the component, add translation logic before the return:

```ts
const needsTranslation = preferredLanguage && preferredLanguage !== "en";
const translation = useQuery(
  api.translations.getTranslation,
  needsTranslation
    ? { postId, language: preferredLanguage }
    : "skip"
);

const [showOriginal, setShowOriginal] = useState(false);

const displayTitle = !showOriginal && translation ? translation.title : title;
const displayContent = !showOriginal && translation ? translation.content : content;
const displayEventLocation =
  !showOriginal && translation?.eventLocation
    ? translation.eventLocation
    : eventLocation;
```

In the JSX, replace the title and content with the display versions:

```tsx
{/* Title */}
<h3 className="font-semibold text-base mt-1">{displayTitle}</h3>

{/* Content */}
<div
  className="prose prose-sm max-w-none mt-2 text-foreground/90"
  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(displayContent) }}
/>
```

Replace `eventLocation` references with `displayEventLocation`.

Add a translation indicator after the event info section (before the interaction bar):

```tsx
{/* Translation indicator */}
{translation && !showOriginal && (
  <button
    onClick={() => setShowOriginal(true)}
    className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
  >
    <Globe className="h-3 w-3" />
    Translated &middot; Show original
  </button>
)}
{showOriginal && translation && (
  <button
    onClick={() => setShowOriginal(false)}
    className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
  >
    <Globe className="h-3 w-3" />
    Show translation
  </button>
)}
```

**Step 3: Verify**

1. Set your preferred language to "es" via the sidebar selector
2. View a post that has been approved — it should show Spanish translation
3. Click "Show original" — should toggle back to English
4. Click "Show translation" — back to Spanish

**Step 4: Commit**

```bash
git add apps/web/components/post-card.tsx apps/web/components/feed.tsx
git commit -m "feat: display translated posts based on user language preference"
```

---

## Task 7: UI — Moderation card also shows translated content indicator

**Files:**
- Modify: `apps/web/app/moderation/page.tsx`

**Step 1: Add translation status to moderation cards**

After a post is approved in the moderation queue, translations are triggered automatically. No changes needed for the moderation flow itself — it already calls `approvePost` which we wired to trigger translations in Task 3.

However, add a small indicator showing available translations on approved posts. This is optional for MVP — skip if tight on time.

**Step 2: Commit (if changes made)**

```bash
git add apps/web/app/moderation/page.tsx
git commit -m "feat: show translation status in moderation queue"
```

---

## Task 8: Update seed data to demonstrate translation

**Files:**
- Modify: `apps/web/convex/seed.ts`

**Step 1: Verify seed already has multi-language stake**

The seed data at `apps/web/convex/seed.ts` already creates the stake with `languages: ["en", "es"]`. No changes needed — translations will trigger automatically when posts are approved in stakes with multiple languages.

**Step 2: Commit (only if changes made)**

No commit needed.

---

## Summary of Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `convex/schema.ts` | Modify | Add `postTranslations` table, `preferredLanguage` on users |
| `convex/translations.ts` | Create | Translation action, queries, helpers |
| `convex/moderation.ts` | Modify | Trigger translation after approval |
| `convex/posts.ts` | Modify | Trigger translation for direct-publish posts |
| `convex/users.ts` | Modify | Add `setPreferredLanguage` mutation |
| `components/left-sidebar.tsx` | Modify | Language selector UI |
| `components/feed.tsx` | Modify | Pass postId + language to PostCard |
| `components/post-card.tsx` | Modify | Fetch/display translations with toggle |

## Verification Checklist

1. Schema syncs: `npx convex dev --once` succeeds
2. Create a post in a multi-language stake → post approved → check Convex dashboard for `postTranslations` rows
3. Set preferred language via sidebar → posts display translated content
4. "Show original" / "Show translation" toggle works
5. New posts with direct-publish also get translated
6. Single-language stakes (only "en") don't trigger unnecessary translations
