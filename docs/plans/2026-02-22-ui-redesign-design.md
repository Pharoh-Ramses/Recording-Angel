# ourStake UI Redesign Design

## Overview

Redesign the ourStake feed UI from a single-column centered layout to a three-column app shell inspired by Peerlist/Twitter. The goal is a modern social platform feel that scales as features are added.

**Reference:** Peerlist social feed (mobbin.com)

## Layout Structure

Full viewport height app shell. No page-level scrolling — only the center feed scrolls.

```
+------------------+------------------------+------------------+
|   Left Sidebar   |      Center Feed       |  Right Sidebar   |
|   (w-60, 240px)  |   (flex-1, max ~600px) |  (w-72, 288px)   |
+------------------+------------------------+------------------+
```

- **Left sidebar:** sticky, full height, border-right. Contains stake branding, feed filters, ward navigation, user section at bottom.
- **Center feed:** `overflow-y-auto`, scrollable. Create post bar at top, post cards below.
- **Right sidebar:** sticky, full height, border-left. Upcoming events + promoted placeholder.

### Responsive Behavior

- **Desktop (lg: 1024px+):** All three columns visible.
- **Tablet (md:):** Left sidebar + center feed. Right sidebar hidden.
- **Mobile:** Center feed only. Left sidebar becomes a bottom tab bar with icons for Feed, Wards, Moderation (if permitted), Profile.

## Post Card Design

Content-forward cards separated by subtle bottom dividers (no wrapping card borders).

```
+----------------------------------------------------------+
|  [Avatar]  Author Name              · 2h ago    [Badge]  |
|            @ward-name                                     |
|                                                           |
|  Post Title (semibold, text-lg)                          |
|                                                           |
|  Post content rendered with prose styling.                |
|                                                           |
|  --- Event info if type=event ---                        |
|  Date  ·  Location                                       |
|                                                           |
|  ─────────────────────────────────────────────────────── |
|  △ Upvote (0)    💬 Comment (0)    🔁 Repost    ↗ Share  |
+----------------------------------------------------------+
```

- **No card wrapper** — posts separated by bottom border dividers.
- **Author line:** avatar + name left, relative time right, ward as secondary text.
- **Type badge:** only for non-announcement types (events, classifieds).
- **Interaction bar:** four icon buttons with counts. All placeholder (non-functional) for MVP.
- **Hover:** subtle background highlight on entire post area.

## Left Sidebar

```
+----------------------+
|  Logo  ourStake       |
|  Example Stake        |
+----------------------+
|  FEED                 |
|  ● All                |
|  ○ Announcements      |
|  ○ Events             |
|  ○ Classifieds        |
+----------------------+
|  WARDS                |
|  ● 1st Ward           |
|  ○ 2nd Ward           |
|  ○ 3rd Ward           |
+----------------------+
|  [Moderation]         |  <- conditional on permissions
|  [Members]            |  <- conditional on permissions
+----------------------+
|        spacer         |
+----------------------+
|  [Avatar] User Name   |
|  [Settings]           |
+----------------------+
```

- Navigation items: `text-sm`, left-padded, subtle active state (background + bold).
- Ward switching navigates via URL.
- Feed filter is local state — filters the feed query by post type.
- Active ward determined from URL params.
- Moderation/Members links conditional on user permissions.
- Mobile: becomes bottom tab bar.

## Right Sidebar

```
+------------------------+
|  UPCOMING EVENTS        |
|  +--------------------+ |
|  | Date               | |
|  | Event Title        | |
|  | Location           | |
|  +--------------------+ |
|  See all events →       |
+------------------------+
|  PROMOTED               |
|  +--------------------+ |
|  | Complete your      | |
|  | profile...         | |
|  |         [Start →]  | |
|  +--------------------+ |
+------------------------+
```

- **Upcoming Events:** queries approved event posts with future dates, sorted by date, limited to 3-5.
- **Event cards:** compact — date, title, location. Clicking navigates to post.
- **"See all events":** sets feed filter to Events.
- **Promoted section:** hardcoded placeholder for now. Later: pinned posts, admin promotions.
- Sticky — stays visible as feed scrolls.
- Hidden on mobile and tablet.

## Create Post Bar

Replaces the current heading + button at top of feed.

```
+----------------------------------------------------------+
|  [Your Avatar]  What's on your mind?          [Post btn]  |
+----------------------------------------------------------+
```

- Compact row at top of center feed.
- Clicking opens existing create post dialog (Tiptap editor, type selector, event fields).
- Ward/stake context clear from left sidebar — no heading needed.

## Technical Decisions

- **No new dependencies.** Uses existing shadcn/ui components + Tailwind.
- **Feed filter:** local `useState` that adds a `type` filter param to the Convex query.
- **Relative time:** lightweight helper function (no library needed for "2h ago", "3d ago").
- **Bottom tab bar (mobile):** a fixed `div` at the bottom with icon buttons, hidden on `lg:`.
- **Post type filtering:** requires a small update to `posts.listByWard` / `posts.listByStake` to accept an optional `type` parameter.

## Scope

### In scope (this redesign)
- Three-column app shell layout
- Redesigned post card with interaction bar (placeholder)
- Left sidebar with feed filters + ward navigation
- Right sidebar with upcoming events + promoted placeholder
- Create post bar at feed top
- Bottom tab bar for mobile
- Responsive breakpoints

### Out of scope
- Functional upvote/comment/share/repost
- Dark mode toggle (already supported via CSS variables)
- Profile page
- Notification system
