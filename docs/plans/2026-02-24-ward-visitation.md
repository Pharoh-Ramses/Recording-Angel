# Ward Visitation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow any authenticated user in a stake to browse any ward's feed read-only without joining, with a "Request to Join" CTA for visitors.

**Architecture:** Pure UI approach — no schema or backend changes. The existing `posts.listByWard` query already returns approved posts without membership checks. We thread an `isMember` boolean from the ward page through Feed → PostCard → interaction components, hiding write controls for visitors and showing a join banner. One small backend fix: allow re-requesting membership after rejection.

**Tech Stack:** Next.js 16 (App Router), Convex (queries/mutations), React, Tailwind CSS, shadcn/ui, Lucide icons

---

### Task 1: Fix `requestToJoin` to allow re-requesting after rejection

Currently `requestToJoin` throws "Already requested or member of this ward" if any membership record exists, including `inactive` (rejected) ones. Visitors who were previously rejected can't re-request.

**Files:**
- Modify: `apps/web/convex/members.ts:19-26`

**Step 1: Update the existing member check**

In `requestToJoin`, replace the blanket "already exists" error with status-aware logic:

```typescript
// In requestToJoin handler, replace lines 19-26:
    // Check existing membership
    const existing = await ctx.db
      .query("members")
      .withIndex("byUserIdAndWardId", (q) =>
        q.eq("userId", user._id).eq("wardId", wardId)
      )
      .unique();

    if (existing) {
      if (existing.status === "active") {
        throw new Error("Already an active member of this ward");
      }
      if (existing.status === "pending") {
        throw new Error("Join request already pending");
      }
      // status === "inactive" (rejected) — allow re-request
      await ctx.db.patch(existing._id, { status: "pending" });
      return existing._id;
    }
```

**Step 2: Verify**

Run: `bunx convex dev` — should sync without errors.

**Step 3: Commit**

```bash
git add apps/web/convex/members.ts
git commit -m "fix: allow re-requesting ward membership after rejection"
```

---

### Task 2: Add `membershipStatus` query for a specific ward

The existing `myMembership` query returns all memberships but doesn't filter by ward. We need a lightweight query to check membership status for a specific ward (used by the ward feed page to determine visitor vs member).

**Files:**
- Modify: `apps/web/convex/members.ts` (add new query at end of file)

**Step 1: Add the query**

Append to `apps/web/convex/members.ts`:

```typescript
export const myWardMembershipStatus = query({
  args: { wardId: v.id("wards") },
  handler: async (ctx, { wardId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const membership = await ctx.db
      .query("members")
      .withIndex("byUserIdAndWardId", (q) =>
        q.eq("userId", user._id).eq("wardId", wardId)
      )
      .unique();

    if (!membership) return { status: "none" as const };
    return { status: membership.status };
  },
});
```

**Step 2: Verify**

Run: `bunx convex dev` — should sync without errors. Test in Convex dashboard: call `members:myWardMembershipStatus` with a wardId.

**Step 3: Commit**

```bash
git add apps/web/convex/members.ts
git commit -m "feat: add myWardMembershipStatus query"
```

---

### Task 3: Add "Home" badge to wards in the left sidebar

Show which wards the user belongs to vs which they're visiting. Uses `myMembership` (already queried elsewhere) to identify home wards.

**Files:**
- Modify: `apps/web/components/left-sidebar.tsx:49-138`

**Step 1: Query user memberships and add badge**

In `left-sidebar.tsx`, add a query for user memberships and render a badge next to home wards:

1. Add import at top:
```typescript
import { Badge } from "@/components/ui/badge";
```

2. Inside the `LeftSidebar` component, after existing queries (around line 67), add:
```typescript
  const memberships = useQuery(api.members.myMembership);
  const memberWardIds = new Set(
    memberships
      ?.filter((m) => m.status === "active")
      .map((m) => m.wardId) ?? []
  );
```

3. In the ward navigation section (around lines 115-137), update the ward link to show a "Home" badge. Replace the ward name rendering:

```tsx
{wards?.map((ward) => {
  const isActive = ward.slug === params.wardSlug;
  const isHome = memberWardIds.has(ward._id);
  return (
    <Link
      key={ward._id}
      href={`/stake/${params.stakeSlug}/ward/${ward.slug}`}
      className={cn(
        "flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full shrink-0",
          isActive ? "bg-primary" : "bg-border",
        )}
      />
      <span className="truncate">{ward.name}</span>
      {isHome && (
        <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 h-4 shrink-0">
          Home
        </Badge>
      )}
    </Link>
  );
})}
```

**Step 2: Verify**

Run: `bun run dev` — navigate to a ward page. Your home ward should show a "Home" badge. Other wards should not.

**Step 3: Commit**

```bash
git add apps/web/components/left-sidebar.tsx
git commit -m "feat: add Home badge to user's wards in sidebar"
```

---

### Task 4: Add visitor join banner to ward feed page

When a non-member views a ward feed, show a banner with the ward name and a "Request to Join" / "Request Pending" button. Hide `CreatePostBar` for visitors.

**Files:**
- Modify: `apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/page.tsx`

**Step 1: Add membership check and join banner**

Replace the entire `page.tsx` content:

```tsx
"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Feed } from "@/components/feed";
import { CreatePostBar } from "@/components/create-post-bar";
import { useFeedFilter } from "@/components/feed-filter-context";
import { Button } from "@/components/ui/button";
import { UserPlus, Clock } from "lucide-react";
import { useState } from "react";

export default function WardFeedPage() {
  const params = useParams<{ stakeSlug: string; wardSlug: string }>();
  const stake = useQuery(api.stakes.getBySlug, { slug: params.stakeSlug });
  const ward = useQuery(
    api.wards.getBySlug,
    stake ? { slug: params.wardSlug, stakeId: stake._id } : "skip"
  );
  const permissions = useQuery(api.roles.myPermissions, {
    wardId: ward?._id,
  });
  const membershipStatus = useQuery(
    api.members.myWardMembershipStatus,
    ward ? { wardId: ward._id } : "skip"
  );
  const { typeFilter } = useFeedFilter();

  const isMember = membershipStatus?.status === "active";
  const isPending = membershipStatus?.status === "pending";

  if (!ward) return null;

  return (
    <>
      {isMember ? (
        <CreatePostBar
          wardId={ward._id}
          canPost={permissions?.includes("post:create") ?? false}
        />
      ) : (
        <VisitorBanner
          wardName={ward.name}
          wardId={ward._id}
          isPending={isPending}
        />
      )}
      <Feed wardId={ward._id} mode="ward" typeFilter={typeFilter} isMember={isMember} />
    </>
  );
}

function VisitorBanner({
  wardName,
  wardId,
  isPending,
}: {
  wardName: string;
  wardId: import("@/convex/_generated/dataModel").Id<"wards">;
  isPending: boolean;
}) {
  const requestToJoin = useMutation(api.members.requestToJoin);
  const [submitting, setSubmitting] = useState(false);
  const [requested, setRequested] = useState(false);

  async function handleJoin() {
    setSubmitting(true);
    try {
      await requestToJoin({ wardId });
      setRequested(true);
    } finally {
      setSubmitting(false);
    }
  }

  const showPending = isPending || requested;

  return (
    <div className="px-4 py-3 border-b border-border bg-muted/30">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          You&apos;re visiting <span className="font-medium text-foreground">{wardName}</span>
        </p>
        {showPending ? (
          <Button variant="outline" size="sm" disabled className="gap-1.5 shrink-0">
            <Clock className="h-3.5 w-3.5" />
            Request Pending
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={handleJoin}
            disabled={submitting}
            className="gap-1.5 shrink-0"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Request to Join
          </Button>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify**

Run: `bun run dev`. This will show a TypeScript error because `Feed` doesn't accept `isMember` yet — that's Task 5.

**Step 3: Commit**

```bash
git add 'apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/page.tsx'
git commit -m "feat: add visitor banner and hide CreatePostBar for non-members"
```

---

### Task 5: Thread `isMember` through Feed → PostCard

Pass the `isMember` boolean from the ward page through Feed into PostCard, so PostCard can hide comment/reply buttons for visitors.

**Files:**
- Modify: `apps/web/components/feed.tsx:9-14,56-69`
- Modify: `apps/web/components/post-card.tsx:16-27,170-215`

**Step 1: Update Feed to accept and pass `isMember`**

In `feed.tsx`:

1. Add `isMember` to the `FeedProps` interface:
```typescript
interface FeedProps {
  wardId?: Id<"wards">;
  stakeId?: Id<"stakes">;
  mode: "ward" | "stake";
  typeFilter?: string;
  isMember?: boolean;
}
```

2. Add `isMember` to the component parameters:
```typescript
export function Feed({ wardId, stakeId, mode, typeFilter, isMember }: FeedProps) {
```

3. Pass `isMember` to each `PostCard` in the map (add after `preferredLanguage`):
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
  isMember={isMember ?? true}
/>
```

**Step 2: Update PostCard to accept `isMember` and conditionally render comment button**

In `post-card.tsx`:

1. Add `isMember` to the `PostCardProps` interface:
```typescript
interface PostCardProps {
  postId: Id<"posts">;
  title: string;
  content: string;
  type: string;
  author: { name: string; imageUrl?: string } | null;
  ward?: { name: string; slug?: string } | null;
  createdAt: number;
  eventDate?: string;
  eventLocation?: string;
  preferredLanguage?: string;
  isMember?: boolean;
}
```

2. Add `isMember` to the destructured props (defaults to `true` for backward compat):
```typescript
export function PostCard({
  postId,
  title,
  content,
  type,
  author,
  ward,
  createdAt,
  eventDate,
  eventLocation,
  preferredLanguage,
  isMember = true,
}: PostCardProps) {
```

3. In the interaction bar (around lines 186-198), wrap the comment/reply button in a conditional:
```tsx
{isMember ? (
  <ReplyDialog
    postId={postId}
    post={{ title, content, author, ward, createdAt }}
  >
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10 gap-1.5 rounded-full"
    >
      <MessageCircle className="h-4 w-4" />
      <span className="text-xs">{count ?? 0}</span>
    </Button>
  </ReplyDialog>
) : (
  <Button
    variant="ghost"
    size="sm"
    className="h-8 px-2 text-muted-foreground gap-1.5 rounded-full cursor-default opacity-50"
    disabled
  >
    <MessageCircle className="h-4 w-4" />
    <span className="text-xs">{count ?? 0}</span>
  </Button>
)}
```

**Step 3: Verify**

Run: `bun run dev` — navigate to a ward where you are NOT a member. You should see:
- Visitor banner with "Request to Join" button (from Task 4)
- Posts visible in the feed
- Comment button grayed out / disabled
- Navigate to your home ward: CreatePostBar visible, comment button active

**Step 4: Commit**

```bash
git add apps/web/components/feed.tsx apps/web/components/post-card.tsx
git commit -m "feat: thread isMember through Feed and PostCard to gate interactions"
```

---

### Task 6: Gate CommentSheet input for visitors

If a visitor somehow opens the CommentSheet (e.g., from a future post detail page), hide the comment input and show a message.

**Files:**
- Modify: `apps/web/components/comment-sheet.tsx:20-23,97-134`

**Step 1: Add `isMember` prop to CommentSheet**

1. Update the interface:
```typescript
interface CommentSheetProps {
  postId: Id<"posts">;
  children: React.ReactNode;
  isMember?: boolean;
}
```

2. Destructure it:
```typescript
export function CommentSheet({ postId, children, isMember = true }: CommentSheetProps) {
```

3. Replace the comment input section (lines 98-134) with a conditional:
```tsx
{isMember ? (
  <div className="border-t border-border pt-4 space-y-2">
    {replyTo && (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Reply className="h-3 w-3" />
        <span>Replying to comment</span>
        <button
          onClick={() => setReplyTo(null)}
          className="text-foreground hover:underline"
        >
          Cancel
        </button>
      </div>
    )}
    <div className="flex gap-2">
      <Textarea
        placeholder="Write a comment..."
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        rows={2}
        className="flex-1 resize-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={!newComment.trim() || submitting}
        className="self-end"
      >
        Post
      </Button>
    </div>
  </div>
) : (
  <div className="border-t border-border pt-4">
    <p className="text-sm text-muted-foreground text-center py-2">
      Join this ward to comment on posts.
    </p>
  </div>
)}
```

**Step 2: Verify**

Run: `bun run dev` — the CommentSheet is not currently directly reachable for visitors (comment button is disabled in Task 5), but verify no TypeScript errors.

**Step 3: Commit**

```bash
git add apps/web/components/comment-sheet.tsx
git commit -m "feat: gate CommentSheet input for non-members"
```

---

### Task 7: Update stake feed page to pass `isMember` (compatibility)

The stake feed page at `/stake/[stakeSlug]/page.tsx` also uses the `Feed` component. Since `isMember` defaults to `true` and stake feed is for all stake members, just ensure no breakage.

**Files:**
- Modify: `apps/web/app/stake/[stakeSlug]/page.tsx` (if it passes props to Feed, verify `isMember` is not required)

**Step 1: Verify the stake page**

Read `apps/web/app/stake/[stakeSlug]/page.tsx`. If it uses `<Feed ... mode="stake">` without `isMember`, confirm it still works because `isMember` defaults to `true` in both Feed and PostCard. No code change needed unless there's a TypeScript error.

**Step 2: Verify**

Run: `bun run dev` — navigate to the stake feed page. Posts should render normally with all interaction buttons active.

**Step 3: Commit (only if changes were needed)**

```bash
# Only if a change was made
git add 'apps/web/app/stake/[stakeSlug]/page.tsx'
git commit -m "fix: ensure stake feed page compatible with isMember prop"
```

---

## Verification Checklist

After all tasks are complete:

1. Navigate to your home ward → see CreatePostBar, active comment buttons, "Home" badge in sidebar
2. Navigate to another ward in the same stake → see visitor banner, "Request to Join" button, disabled comment buttons, no CreatePostBar
3. Click "Request to Join" → button changes to "Request Pending"
4. Approve the request from the admin view → refresh → now see full member controls
5. Check sidebar → home ward shows "Home" badge, other wards don't
6. Mobile viewport → visitor banner visible above feed (no sidebar needed)
