# UI Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use superpowers:frontend-design for all component creation to ensure high design quality.

**Goal:** Redesign the feed UI from a single-column layout to a three-column app shell with left sidebar navigation, center scrollable feed, and right sidebar for events/promotions.

**Architecture:** Replace the current per-page header + centered `max-w-3xl` layout with a full-height flexbox app shell. The left sidebar handles navigation and filtering, the center column scrolls the feed, and the right sidebar shows contextual content. On mobile, sidebars collapse and a bottom tab bar appears.

**Tech Stack:** Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui, Convex, Clerk, Lucide React icons

---

### Task 1: Add Upcoming Events Query

**Files:**
- Modify: `apps/web/convex/posts.ts`

**Context:** The right sidebar needs upcoming events. We need a query that fetches approved event posts with future dates. The current schema stores `eventDate` as an optional string. We also need to support post type filtering for the left sidebar feed filters.

**Step 1: Add `upcomingEvents` query to `posts.ts`**

Add this query at the end of `apps/web/convex/posts.ts`:

```typescript
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
```

**Step 2: Verify Convex compiles**

Run: `cd apps/web && bunx convex dev` (it should sync without errors)

**Step 3: Commit**

```bash
git add apps/web/convex/posts.ts
git commit -m "feat: add upcomingEvents query for right sidebar"
```

---

### Task 2: Relative Time Utility

**Files:**
- Create: `apps/web/lib/utils.ts`

**Context:** Post cards need to display relative time ("2h ago", "3d ago") instead of absolute dates. Create a lightweight utility — no external library needed.

**Step 1: Create the utility file**

Create `apps/web/lib/utils.ts`:

```typescript
export function relativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 5) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}
```

**Step 2: Commit**

```bash
git add apps/web/lib/utils.ts
git commit -m "feat: add relativeTime utility"
```

---

### Task 3: Redesign PostCard Component

**Files:**
- Modify: `apps/web/components/post-card.tsx`

**Context:** Replace the current shadcn Card-wrapped post with a borderless, divider-separated card. Add interaction bar with placeholder icons (upvote, comment, repost, share). Use Lucide icons. Import `relativeTime` from the new utility.

Reference the design doc: no card wrapper, author line with avatar + name + relative time, type badge only for non-announcement types, interaction bar with icon buttons, subtle hover background.

**Step 1: Rewrite `post-card.tsx`**

Replace the entire contents of `apps/web/components/post-card.tsx` with:

```tsx
"use client";

import DOMPurify from "isomorphic-dompurify";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUp, MessageCircle, Repeat2, Share } from "lucide-react";
import { relativeTime } from "@/lib/utils";

interface PostCardProps {
  title: string;
  content: string;
  type: string;
  author: { name: string; imageUrl?: string } | null;
  ward?: { name: string } | null;
  createdAt: number;
  eventDate?: string;
  eventLocation?: string;
}

export function PostCard({
  title,
  content,
  type,
  author,
  ward,
  createdAt,
  eventDate,
  eventLocation,
}: PostCardProps) {
  const initials = author?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="group px-4 py-4 border-b border-border hover:bg-muted/30 transition-colors">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          {author?.imageUrl && <AvatarImage src={author.imageUrl} />}
          <AvatarFallback>{initials ?? "?"}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Author line */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">
              {author?.name ?? "Unknown"}
            </span>
            {ward && (
              <span className="text-xs text-muted-foreground truncate">
                @{ward.name.toLowerCase().replace(/\s+/g, "-")}
              </span>
            )}
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {relativeTime(createdAt)}
            </span>
            {type !== "announcement" && (
              <Badge variant="secondary" className="text-xs ml-auto shrink-0">
                {type}
              </Badge>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-base mt-1">{title}</h3>

          {/* Content */}
          <div
            className="prose prose-sm max-w-none mt-2 text-foreground/90"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
          />

          {/* Event info */}
          {type === "event" && (eventDate || eventLocation) && (
            <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
              {eventDate && (
                <span className="flex items-center gap-1">
                  📅 {new Date(eventDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
              {eventLocation && (
                <span className="flex items-center gap-1">
                  📍 {eventLocation}
                </span>
              )}
            </div>
          )}

          {/* Interaction bar */}
          <div className="flex items-center gap-1 mt-3 -ml-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground gap-1.5"
              onClick={(e) => e.preventDefault()}
            >
              <ArrowUp className="h-4 w-4" />
              <span className="text-xs">0</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground gap-1.5"
              onClick={(e) => e.preventDefault()}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">0</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground gap-1.5"
              onClick={(e) => e.preventDefault()}
            >
              <Repeat2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground gap-1.5"
              onClick={(e) => e.preventDefault()}
            >
              <Share className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
```

**Step 2: Verify it compiles**

Run: `cd apps/web && bun run dev` — navigate to the ward feed and verify the post card renders with the new design.

**Step 3: Commit**

```bash
git add apps/web/components/post-card.tsx
git commit -m "feat: redesign PostCard with interaction bar and relative time"
```

---

### Task 4: Update Feed Component

**Files:**
- Modify: `apps/web/components/feed.tsx`

**Context:** The feed component currently wraps posts in `space-y-4` with card gaps. Update it to remove spacing (posts are now separated by bottom borders from the PostCard itself). Also remove the `Button` import since "Load more" can use a simpler link-style element. The feed should accept an optional `typeFilter` prop.

**Step 1: Update `feed.tsx`**

Replace the entire contents of `apps/web/components/feed.tsx` with:

```tsx
"use client";

import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PostCard } from "./post-card";
import { Button } from "@/components/ui/button";
import { Id } from "@/convex/_generated/dataModel";

interface FeedProps {
  wardId?: Id<"wards">;
  stakeId?: Id<"stakes">;
  mode: "ward" | "stake";
  typeFilter?: string;
}

export function Feed({ wardId, stakeId, mode, typeFilter }: FeedProps) {
  const wardFeed = usePaginatedQuery(
    api.posts.listByWard,
    mode === "ward" && wardId ? { wardId } : "skip",
    { initialNumItems: 10 }
  );

  const stakeFeed = usePaginatedQuery(
    api.posts.listByStake,
    mode === "stake" && stakeId ? { stakeId } : "skip",
    { initialNumItems: 10 }
  );

  const feed = mode === "ward" ? wardFeed : stakeFeed;

  if (feed.status === "LoadingFirstPage") {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  const filteredResults = typeFilter
    ? feed.results.filter((post) => post.type === typeFilter)
    : feed.results;

  if (filteredResults.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        No posts yet. Be the first to share something!
      </div>
    );
  }

  return (
    <div>
      {filteredResults.map((post) => (
        <PostCard
          key={post._id}
          title={post.title}
          content={post.content}
          type={post.type}
          author={post.author ?? null}
          ward={"ward" in post ? (post as any).ward : undefined}
          createdAt={post._creationTime}
          eventDate={post.eventDate}
          eventLocation={post.eventLocation}
        />
      ))}
      {feed.status === "CanLoadMore" && (
        <div className="flex justify-center py-4">
          <Button
            variant="ghost"
            className="text-sm text-muted-foreground"
            onClick={() => feed.loadMore(10)}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify it compiles and renders**

**Step 3: Commit**

```bash
git add apps/web/components/feed.tsx
git commit -m "feat: update Feed with typeFilter support and borderless layout"
```

---

### Task 5: Create Left Sidebar Component

**Files:**
- Create: `apps/web/components/left-sidebar.tsx`

**Context:** The left sidebar shows: stake branding at top, feed type filters (All, Announcements, Events, Classifieds), ward navigation list, conditional moderation/members links, and user section at bottom. Active ward and active filter are highlighted. Ward switching navigates via URL. Feed filter is controlled via a callback prop.

Uses: Lucide icons, `useParams` for active ward detection, `useQuery` for ward list and permissions, Clerk `UserButton`.

**Step 1: Create `left-sidebar.tsx`**

Create `apps/web/components/left-sidebar.tsx`:

```tsx
"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import {
  LayoutList,
  Megaphone,
  CalendarDays,
  ShoppingBag,
  Shield,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";

const FEED_FILTERS = [
  { label: "All", value: undefined, icon: LayoutList },
  { label: "Announcements", value: "announcement", icon: Megaphone },
  { label: "Events", value: "event", icon: CalendarDays },
  { label: "Classifieds", value: "classifieds", icon: ShoppingBag },
] as const;

interface LeftSidebarProps {
  typeFilter?: string;
  onTypeFilterChange: (type: string | undefined) => void;
}

export function LeftSidebar({
  typeFilter,
  onTypeFilterChange,
}: LeftSidebarProps) {
  const params = useParams<{ stakeSlug: string; wardSlug: string }>();
  const stake = useQuery(api.stakes.getBySlug, { slug: params.stakeSlug });
  const wards = useQuery(
    api.wards.listByStake,
    stake ? { stakeId: stake._id } : "skip"
  );
  const activeWard = wards?.find((w) => w.slug === params.wardSlug);
  const permissions = useQuery(
    api.roles.myPermissions,
    activeWard ? { wardId: activeWard._id } : "skip"
  );
  const currentUser = useQuery(api.users.currentUser);

  return (
    <aside className="hidden lg:flex flex-col w-60 border-r border-border h-screen sticky top-0 bg-background">
      {/* Stake branding */}
      <div className="p-4 border-b border-border">
        <Link
          href={`/stake/${params.stakeSlug}`}
          className="block"
        >
          <h1 className="font-bold text-lg">ourStake</h1>
          <p className="text-xs text-muted-foreground truncate">
            {stake?.name}
          </p>
        </Link>
      </div>

      {/* Feed filters */}
      <div className="px-2 pt-4">
        <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Feed
        </p>
        <nav className="space-y-0.5">
          {FEED_FILTERS.map((filter) => {
            const isActive = typeFilter === filter.value;
            const Icon = filter.icon;
            return (
              <button
                key={filter.label}
                onClick={() => onTypeFilterChange(filter.value)}
                className={cn(
                  "flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {filter.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Ward navigation */}
      <div className="px-2 pt-6">
        <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Wards
        </p>
        <nav className="space-y-0.5">
          {wards?.map((ward) => {
            const isActive = ward.slug === params.wardSlug;
            return (
              <Link
                key={ward._id}
                href={`/stake/${params.stakeSlug}/ward/${ward.slug}`}
                className={cn(
                  "flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    isActive ? "bg-primary" : "bg-border"
                  )}
                />
                {ward.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Conditional admin links */}
      {(permissions?.includes("member:approve") ||
        permissions?.includes("post:approve")) && (
        <div className="px-2 pt-6">
          <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Admin
          </p>
          <nav className="space-y-0.5">
            {permissions?.includes("member:approve") && (
              <Link
                href={`/stake/${params.stakeSlug}/ward/${params.wardSlug}/members`}
                className="flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                <Users className="h-4 w-4" />
                Members
              </Link>
            )}
            {permissions?.includes("post:approve") && (
              <Link
                href="/moderation"
                className="flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                <Shield className="h-4 w-4" />
                Moderation
              </Link>
            )}
          </nav>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* User section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <UserButton />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {currentUser?.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {currentUser?.email}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
```

**Step 2: Create `cn` utility**

Create `apps/web/lib/cn.ts`:

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Note: Check if this already exists — shadcn may have created it. If `apps/web/lib/utils.ts` already has a `cn` export, import from there instead and add the `relativeTime` function to the same file. If not, create the separate `cn.ts` file.

**Step 3: Verify it compiles**

**Step 4: Commit**

```bash
git add apps/web/components/left-sidebar.tsx apps/web/lib/cn.ts
git commit -m "feat: create LeftSidebar with feed filters and ward navigation"
```

---

### Task 6: Create Right Sidebar Component

**Files:**
- Create: `apps/web/components/right-sidebar.tsx`

**Context:** The right sidebar shows upcoming events and a promoted section placeholder. It queries `posts.upcomingEvents` using the current ward or stake ID. Compact event cards with date, title, location. A "See all events" link sets the feed filter. Hidden on mobile/tablet.

**Step 1: Create `right-sidebar.tsx`**

Create `apps/web/components/right-sidebar.tsx`:

```tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CalendarDays, MapPin, ArrowRight } from "lucide-react";

interface RightSidebarProps {
  wardId?: Id<"wards">;
  stakeId?: Id<"stakes">;
  onShowEvents: () => void;
}

export function RightSidebar({
  wardId,
  stakeId,
  onShowEvents,
}: RightSidebarProps) {
  const events = useQuery(
    api.posts.upcomingEvents,
    wardId ? { wardId } : stakeId ? { stakeId } : "skip"
  );

  return (
    <aside className="hidden lg:block w-72 border-l border-border h-screen sticky top-0 bg-background overflow-y-auto">
      {/* Upcoming Events */}
      <div className="p-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Upcoming Events
        </h2>

        {events && events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event._id}
                className="rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors cursor-pointer"
              >
                {event.eventDate && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <CalendarDays className="h-3 w-3" />
                    {new Date(event.eventDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                )}
                <p className="text-sm font-medium leading-tight">
                  {event.title}
                </p>
                {event.eventLocation && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3" />
                    {event.eventLocation}
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={onShowEvents}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full pt-1"
            >
              See all events
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No upcoming events
          </p>
        )}
      </div>

      {/* Promoted section */}
      <div className="p-4 pt-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Promoted
        </h2>
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-sm font-medium">Complete your profile</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add a photo and bio to connect with your ward members.
          </p>
          <button className="flex items-center gap-1 text-xs font-medium text-primary mt-3 hover:underline">
            Get started
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </aside>
  );
}
```

**Step 2: Verify it compiles**

**Step 3: Commit**

```bash
git add apps/web/components/right-sidebar.tsx
git commit -m "feat: create RightSidebar with upcoming events and promoted section"
```

---

### Task 7: Create Mobile Bottom Tab Bar

**Files:**
- Create: `apps/web/components/bottom-tab-bar.tsx`

**Context:** On mobile, the left sidebar is hidden. A fixed bottom tab bar provides navigation. Icons for: Feed (home), Wards (list), Moderation (shield, conditional), Profile (user). Visible only below `lg:` breakpoint.

**Step 1: Create `bottom-tab-bar.tsx`**

Create `apps/web/components/bottom-tab-bar.tsx`:

```tsx
"use client";

import { useParams, usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Home, LayoutList, Shield, User } from "lucide-react";
import { cn } from "@/lib/cn";

export function BottomTabBar() {
  const params = useParams<{ stakeSlug: string; wardSlug: string }>();
  const pathname = usePathname();

  const ward = useQuery(
    api.wards.getBySlug,
    params.wardSlug ? { slug: params.wardSlug } : "skip"
  );
  const permissions = useQuery(
    api.roles.myPermissions,
    ward ? { wardId: ward._id } : "skip"
  );

  const tabs = [
    {
      label: "Feed",
      icon: Home,
      href: params.wardSlug
        ? `/stake/${params.stakeSlug}/ward/${params.wardSlug}`
        : `/stake/${params.stakeSlug}`,
      active: pathname?.includes("/ward/") && !pathname?.includes("/members"),
    },
    {
      label: "Wards",
      icon: LayoutList,
      href: `/stake/${params.stakeSlug}`,
      active: pathname === `/stake/${params.stakeSlug}`,
    },
    ...(permissions?.includes("post:approve")
      ? [
          {
            label: "Moderate",
            icon: Shield,
            href: "/moderation",
            active: pathname?.startsWith("/moderation"),
          },
        ]
      : []),
    {
      label: "Profile",
      icon: User,
      href: "/settings",
      active: pathname === "/settings",
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors",
                tab.active
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

**Step 2: Verify it compiles**

**Step 3: Commit**

```bash
git add apps/web/components/bottom-tab-bar.tsx
git commit -m "feat: create BottomTabBar for mobile navigation"
```

---

### Task 8: Create Create Post Bar Component

**Files:**
- Create: `apps/web/components/create-post-bar.tsx`

**Context:** A compact bar at the top of the feed with the user's avatar and "What's on your mind?" text. Clicking it opens the existing create post dialog. Replaces the old heading + button approach.

**Step 1: Create `create-post-bar.tsx`**

Create `apps/web/components/create-post-bar.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CreatePostButton } from "./create-post-button";

interface CreatePostBarProps {
  wardId: Id<"wards">;
  canPost: boolean;
}

export function CreatePostBar({ wardId, canPost }: CreatePostBarProps) {
  const currentUser = useQuery(api.users.currentUser);

  const initials = currentUser?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!canPost) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
      <Avatar className="h-9 w-9 shrink-0">
        {currentUser?.imageUrl && (
          <AvatarImage src={currentUser.imageUrl} />
        )}
        <AvatarFallback className="text-xs">{initials ?? "?"}</AvatarFallback>
      </Avatar>
      <CreatePostButton wardId={wardId} triggerVariant="bar" />
    </div>
  );
}
```

**Step 2: Update `CreatePostButton` to accept a `triggerVariant` prop**

Modify `apps/web/components/create-post-button.tsx`. Add a `triggerVariant` prop that changes the trigger between a button and an inline bar-style element.

Find the component's props and trigger:

```tsx
// Change the props type
export function CreatePostButton({
  wardId,
  triggerVariant = "button",
}: {
  wardId: Id<"wards">;
  triggerVariant?: "button" | "bar";
}) {
```

Replace the `DialogTrigger` section:

```tsx
      <DialogTrigger asChild>
        {triggerVariant === "bar" ? (
          <button className="flex-1 text-left text-sm text-muted-foreground hover:text-foreground transition-colors rounded-full bg-muted/50 px-4 py-2">
            What&apos;s on your mind?
          </button>
        ) : (
          <Button>New Post</Button>
        )}
      </DialogTrigger>
```

**Step 3: Verify it compiles**

**Step 4: Commit**

```bash
git add apps/web/components/create-post-bar.tsx apps/web/components/create-post-button.tsx
git commit -m "feat: create CreatePostBar with inline trigger variant"
```

---

### Task 9: Create App Shell Layout

**Files:**
- Create: `apps/web/components/app-shell.tsx`

**Context:** The app shell is the three-column layout container. It renders the left sidebar, center content (children), and right sidebar. It manages the feed type filter state and passes it down. This component will be used by both the ward feed and stake feed pages.

**Step 1: Create `app-shell.tsx`**

Create `apps/web/components/app-shell.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { LeftSidebar } from "./left-sidebar";
import { RightSidebar } from "./right-sidebar";
import { BottomTabBar } from "./bottom-tab-bar";

interface AppShellProps {
  wardId?: Id<"wards">;
  stakeId?: Id<"stakes">;
  typeFilter?: string;
  onTypeFilterChange: (type: string | undefined) => void;
  children: React.ReactNode;
}

export function AppShell({
  wardId,
  stakeId,
  typeFilter,
  onTypeFilterChange,
  children,
}: AppShellProps) {
  return (
    <div className="flex h-screen bg-background">
      <LeftSidebar
        typeFilter={typeFilter}
        onTypeFilterChange={onTypeFilterChange}
      />

      {/* Center feed column */}
      <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
        <div className="mx-auto max-w-2xl">
          {children}
        </div>
      </main>

      <RightSidebar
        wardId={wardId}
        stakeId={stakeId}
        onShowEvents={() => onTypeFilterChange("event")}
      />

      <BottomTabBar />
    </div>
  );
}
```

**Step 2: Verify it compiles**

**Step 3: Commit**

```bash
git add apps/web/components/app-shell.tsx
git commit -m "feat: create AppShell three-column layout container"
```

---

### Task 10: Update Ward Feed Page

**Files:**
- Modify: `apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/page.tsx`
- Modify: `apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/layout.tsx`

**Context:** Replace the current ward layout (header + centered main) and ward feed page (heading + button + feed) with the new app shell. The layout becomes the app shell, and the page just renders the create post bar + feed.

**Step 1: Rewrite the ward layout**

Replace the entire contents of `apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/layout.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/app-shell";

export default function WardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ stakeSlug: string; wardSlug: string }>();
  const ward = useQuery(api.wards.getBySlug, { slug: params.wardSlug });
  const [typeFilter, setTypeFilter] = useState<string | undefined>();

  return (
    <AppShell
      wardId={ward?._id}
      stakeId={ward?.stakeId}
      typeFilter={typeFilter}
      onTypeFilterChange={setTypeFilter}
    >
      {children}
    </AppShell>
  );
}
```

**Problem:** The `typeFilter` state lives in the layout but the feed page needs it. We need to pass it down. Since Next.js App Router doesn't allow passing props from layout to page, we'll use React context.

**Step 2: Create a feed filter context**

Create `apps/web/components/feed-filter-context.tsx`:

```tsx
"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface FeedFilterContextValue {
  typeFilter: string | undefined;
  setTypeFilter: (type: string | undefined) => void;
}

const FeedFilterContext = createContext<FeedFilterContextValue>({
  typeFilter: undefined,
  setTypeFilter: () => {},
});

export function FeedFilterProvider({ children }: { children: ReactNode }) {
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  return (
    <FeedFilterContext.Provider value={{ typeFilter, setTypeFilter }}>
      {children}
    </FeedFilterContext.Provider>
  );
}

export function useFeedFilter() {
  return useContext(FeedFilterContext);
}
```

**Step 3: Update the ward layout to use the context**

Replace the ward layout with:

```tsx
"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { FeedFilterProvider, useFeedFilter } from "@/components/feed-filter-context";

function WardLayoutInner({ children }: { children: React.ReactNode }) {
  const params = useParams<{ stakeSlug: string; wardSlug: string }>();
  const ward = useQuery(api.wards.getBySlug, { slug: params.wardSlug });
  const { typeFilter, setTypeFilter } = useFeedFilter();

  return (
    <AppShell
      wardId={ward?._id}
      stakeId={ward?.stakeId}
      typeFilter={typeFilter}
      onTypeFilterChange={setTypeFilter}
    >
      {children}
    </AppShell>
  );
}

export default function WardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FeedFilterProvider>
      <WardLayoutInner>{children}</WardLayoutInner>
    </FeedFilterProvider>
  );
}
```

**Step 4: Update the ward feed page**

Replace the entire contents of `apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/page.tsx`:

```tsx
"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Feed } from "@/components/feed";
import { CreatePostBar } from "@/components/create-post-bar";
import { useFeedFilter } from "@/components/feed-filter-context";

export default function WardFeedPage() {
  const params = useParams<{ stakeSlug: string; wardSlug: string }>();
  const ward = useQuery(api.wards.getBySlug, { slug: params.wardSlug });
  const permissions = useQuery(api.roles.myPermissions, {
    wardId: ward?._id,
  });
  const { typeFilter } = useFeedFilter();

  if (!ward) return null;

  return (
    <>
      <CreatePostBar
        wardId={ward._id}
        canPost={permissions?.includes("post:create") ?? false}
      />
      <Feed wardId={ward._id} mode="ward" typeFilter={typeFilter} />
    </>
  );
}
```

**Step 5: Verify everything compiles and renders**

Run: `cd apps/web && bun run dev` — navigate to a ward page and verify the three-column layout renders.

**Step 6: Commit**

```bash
git add apps/web/app/stake/\\[stakeSlug\\]/ward/\\[wardSlug\\]/layout.tsx \
       apps/web/app/stake/\\[stakeSlug\\]/ward/\\[wardSlug\\]/page.tsx \
       apps/web/components/feed-filter-context.tsx
git commit -m "feat: wire up ward pages with AppShell three-column layout"
```

---

### Task 11: Update Stake Feed Page

**Files:**
- Modify: `apps/web/app/stake/[stakeSlug]/page.tsx`
- Modify: `apps/web/app/stake/[stakeSlug]/layout.tsx`

**Context:** The stake feed page currently has its own header and ward list. With the new layout, it should also use the app shell. The ward list moves to the left sidebar. The stake page shows the stake-level feed with the create post bar (if applicable).

Since the stake page doesn't have a specific ward context, the left sidebar should highlight no ward (or show "Stake" as active). The right sidebar uses `stakeId`.

**Step 1: Update the stake layout**

Replace `apps/web/app/stake/[stakeSlug]/layout.tsx`:

```tsx
"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function StakeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

This stays as a passthrough since the ward layout handles the shell for ward pages, and the stake page will render its own shell.

**Step 2: Update the stake feed page**

Replace the entire contents of `apps/web/app/stake/[stakeSlug]/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Feed } from "@/components/feed";
import { AppShell } from "@/components/app-shell";
import { FeedFilterProvider, useFeedFilter } from "@/components/feed-filter-context";

function StakeFeedInner() {
  const params = useParams<{ stakeSlug: string }>();
  const stake = useQuery(api.stakes.getBySlug, { slug: params.stakeSlug });
  const { typeFilter } = useFeedFilter();

  if (!stake) return null;

  return (
    <>
      <div className="px-4 py-3 border-b border-border">
        <h1 className="font-semibold text-lg">{stake.name}</h1>
        <p className="text-xs text-muted-foreground">Stake Announcements</p>
      </div>
      <Feed stakeId={stake._id} mode="stake" typeFilter={typeFilter} />
    </>
  );
}

function StakePageWithShell() {
  const params = useParams<{ stakeSlug: string }>();
  const stake = useQuery(api.stakes.getBySlug, { slug: params.stakeSlug });
  const { typeFilter, setTypeFilter } = useFeedFilter();

  return (
    <AppShell
      stakeId={stake?._id}
      typeFilter={typeFilter}
      onTypeFilterChange={setTypeFilter}
    >
      <StakeFeedInner />
    </AppShell>
  );
}

export default function StakeFeedPage() {
  return (
    <FeedFilterProvider>
      <StakePageWithShell />
    </FeedFilterProvider>
  );
}
```

**Step 3: Verify it compiles and renders**

**Step 4: Commit**

```bash
git add apps/web/app/stake/\\[stakeSlug\\]/page.tsx \
       apps/web/app/stake/\\[stakeSlug\\]/layout.tsx
git commit -m "feat: update stake feed page with AppShell layout"
```

---

### Task 12: Polish and Visual Refinements

**Files:**
- Modify: various components for visual tweaks

**Context:** Final pass to ensure consistent styling, proper spacing, and responsive behavior. Use the frontend-design skill for this task to ensure high design quality.

**Step 1: Add `pb-16` to center column for mobile bottom bar clearance**

This is already done in the `AppShell` component (`pb-16 lg:pb-0`). Verify it works on mobile viewport.

**Step 2: Verify the `members/page.tsx` still works within the app shell**

The members page is a child of the ward layout, so it will inherit the app shell. Check that it renders correctly within the center column.

Read `apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/members/page.tsx` and ensure it doesn't have its own header/layout that conflicts.

**Step 3: Test all breakpoints**

- Desktop (1280px+): all three columns visible
- Tablet (768-1023px): left sidebar + center
- Mobile (< 768px): center only + bottom tab bar

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: polish responsive behavior and visual refinements"
```

---

## Summary

| Task | Component | Description |
|------|-----------|-------------|
| 1 | `posts.ts` | Add `upcomingEvents` query |
| 2 | `lib/utils.ts` | Add `relativeTime` utility |
| 3 | `post-card.tsx` | Redesign with interaction bar |
| 4 | `feed.tsx` | Add `typeFilter` support, borderless layout |
| 5 | `left-sidebar.tsx` | Feed filters + ward nav + user section |
| 6 | `right-sidebar.tsx` | Upcoming events + promoted placeholder |
| 7 | `bottom-tab-bar.tsx` | Mobile navigation |
| 8 | `create-post-bar.tsx` | Inline create post trigger |
| 9 | `app-shell.tsx` | Three-column layout container |
| 10 | Ward pages | Wire up ward layout + page with app shell |
| 11 | Stake page | Wire up stake page with app shell |
| 12 | Polish | Responsive tweaks and visual refinements |
