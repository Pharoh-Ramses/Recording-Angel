# ourStake MVP Design

## Overview

ourStake is a community platform for LDS (Church of Jesus Christ of Latter-day Saints) stakes and wards. It solves fragmented communication by providing a central place to manage announcements, events, forms, polls, and member-to-member posts.

**MVP Scope:** Auth + Feed + Moderation for a single-stake pilot (~5-12 wards).

**Architecture:** Convex-native real-time feed. All data lives in Convex with real-time subscriptions. Clerk handles authentication.

## Tech Stack

- **Framework:** Next.js 16, Turborepo, Bun
- **UI:** Tailwind CSS, shadcn/ui, Tiptap (rich text)
- **Backend:** Convex (database + real-time + server functions)
- **Auth:** Clerk (synced to Convex via webhooks)
- **AI Moderation:** GPT-4o-mini (via OpenAI API)
- **Future - Translation:** GPT-4o-mini for post translation
- **Future - Recording Angel API:** Hono + Bun + Postgres (NeonDB + Drizzle ORM)
- **Future - Media:** Remotion

## Data Model

### Core Tables

| Table | Key Fields | Purpose |
|-------|-----------|---------|
| `stakes` | `name`, `slug`, `languages[]`, `settings` | Stake-level config and metadata |
| `wards` | `name`, `slug`, `stakeId`, `settings` | Ward belonging to a stake |
| `members` | `clerkUserId`, `wardId`, `stakeId`, `status` | User-ward membership (`pending`/`active`/`inactive`) |
| `posts` | `authorId`, `wardId`, `stakeId`, `scope`, `type`, `content`, `status`, `moderationNotes` | Core content unit |
| `roles` | `name`, `wardId`, `permissions[]`, `isSystem` | Configurable roles per ward |
| `memberRoles` | `memberId`, `roleId` | Many-to-many: member to role |
| `moderationSettings` | `wardId` or `stakeId`, `aiPrompt`, `autoApproveTypes[]` | AI moderation configuration |

### Key Relationships

- A stake has many wards.
- A ward has many members and roles.
- A member belongs to exactly one ward (can visit others read-only).
- A post has a `scope` field (`"ward"` or `"stake"`) determining which feed it appears in. Ward posts can be promoted to stake scope.
- Post `status` lifecycle: `draft` -> `pending_review` -> `approved` / `rejected`.
- Roles are per-ward with system defaults that can't be deleted, plus custom roles.
- Permissions are string constants checked server-side.

## Auth & Membership Flow

### Authentication

- Clerk handles sign-up/sign-in (email, Google, Apple — configurable).
- On first sign-up, a Convex webhook creates a `members` record with `status: "pending"` and no ward assignment.
- Clerk JWT validated in Convex via the built-in Clerk integration.

### Joining a Ward

1. After sign-up, user sees a "Join a Ward" flow.
2. Search by stake name, select ward, submit join request.
3. Request sets `wardId` and `stakeId` on member record; status stays `pending`.
4. User with `member:approve` permission (bishop by default) sees pending requests and approves/rejects.
5. On approval, status becomes `active` and user can access feeds.

### Session State

- Active ward context stored in the URL: `/stake/[stakeSlug]/ward/[wardSlug]`.
- Visiting another ward navigates to its URL — read-only access unless they're a member.
- No separate visitor record; the app checks membership on each page.

## Feed Architecture

### URL Structure

```
/                                                    Landing/onboarding
/stake/[stakeSlug]                                   Stake-level feed
/stake/[stakeSlug]/ward/[wardSlug]                   Ward-level feed
/stake/[stakeSlug]/ward/[wardSlug]/post/[postId]     Single post view
/moderation                                          Moderation dashboard (role-gated)
/moderation/settings                                 AI prompt config (role-gated)
/join                                                Ward join flow
/settings                                            User settings
```

### Feed Behavior

- **Ward feed:** All `approved` posts where `wardId` matches, newest first. Real-time via `useQuery("posts:listByWard", { wardId })`.
- **Stake feed:** All `approved` posts where `stakeId` matches AND `scope: "stake"`, newest first. Real-time via `useQuery("posts:listByStake", { stakeId })`.
- Pagination via Convex cursor-based `.paginate()`.

### Post Types (extensible)

- `announcement` — Text-based update.
- `event` — Has date/time/location fields in addition to content.
- `poll` — Embedded poll with options (future: `pollOptions` and `pollVotes` tables).
- `form` — Link to external form or embedded (future).
- `classifieds` — Member-to-member posts (e.g., furniture giveaway).

### Post Creation

- Tiptap editor for rich text content.
- Post type selector determines which extra fields appear.
- On submit, status depends on author's role permissions:
  - Has `post:publish_directly` -> status = `approved`.
  - Otherwise -> status = `pending_review`.

## Moderation Pipeline

```
Post Created -> AI Pre-Screen -> Auto Decision or Manual Queue -> Published/Rejected
```

### Step 1: AI Pre-Screen (Convex Action)

- When a post enters `pending_review`, a Convex action sends content to GPT-4o-mini.
- AI returns: `approve`, `reject` (with reason), or `needs_review`.
- `approve` -> post status becomes `approved`, appears in feed instantly.
- `reject` -> status becomes `rejected`, author notified with reason.
- `needs_review` -> stays in `pending_review`, added to manual queue.

### Step 2: Manual Review (Moderation Dashboard)

- Accessible at `/moderation`, gated by `post:approve` permission.
- Shows all `pending_review` posts for moderator's ward (and stake if they have stake-level permissions).
- Moderator can: approve, reject (with note), or request edits.
- Real-time queue via Convex subscription.

### Configurable AI Prompts

- Bishops and stake presidents (users with `moderation:configure` permission) can customize the AI moderation prompt.
- Managed via `/moderation/settings`.
- `moderationSettings` table stores per-ward/stake prompt text and optional auto-approve post types.
- Default prompt ships with sensible defaults; leaders tweak as needed.

### Comment Moderation (future, designed for)

- Same pipeline applies to a `comments` table with `postId`, `authorId`, `content`, `status`.

## Role & Permission System

### System Roles (per ward, can't be deleted)

| Role | Default Permissions |
|------|-------------------|
| `bishop` | All permissions (ward admin) |
| `bishopric` | `post:create`, `post:publish_directly`, `post:approve`, `member:approve` |
| `clerk` | `post:create`, `post:publish_directly`, `member:view` |
| `member` | `post:create` |

### Stake-Level System Roles

| Role | Default Permissions |
|------|-------------------|
| `stake_president` | All permissions (stake admin), `moderation:configure` at stake level |
| `stake_clerk` | `post:create`, `post:publish_directly` at stake level |

### Permission Strings (MVP)

```
post:create              Can create posts
post:publish_directly    Bypasses moderation
post:approve             Can approve/reject in moderation queue
post:promote_to_stake    Can promote ward post to stake feed
member:approve           Can approve ward join requests
member:view              Can view member directory
role:manage              Can create/edit custom roles and assign permissions
moderation:configure     Can edit AI moderation prompts/settings
```

### Custom Roles

- Users with `role:manage` can create new roles with any subset of permissions.
- Custom roles are per-ward; stake-level custom roles are a future feature.

### Permission Checking

- All checks happen server-side in Convex mutations/queries.
- `hasPermission(memberId, permission)` utility resolves member -> roles -> permissions.
- Client-side `usePermissions()` hook fetches current user's permission set for conditional UI rendering.

## Component Structure

```
apps/web/
  app/
    layout.tsx                        Clerk + Convex providers
    page.tsx                          Landing/onboarding
    stake/[stakeSlug]/
      page.tsx                        Stake feed
      ward/[wardSlug]/
        page.tsx                      Ward feed
        post/[postId]/
          page.tsx                    Single post
    moderation/
      page.tsx                        Moderation queue
      settings/page.tsx               AI prompt config
    join/page.tsx                     Ward join flow
    settings/page.tsx                 User settings
  convex/
    schema.ts                         All table definitions
    posts.ts                          Post queries/mutations
    members.ts                        Membership queries/mutations
    roles.ts                          Role/permission logic
    moderation.ts                     AI screening + queue
    auth.ts                           Clerk webhook + helpers

packages/ui/
  post-card.tsx                       Post display component
  feed.tsx                            Feed list component
  rich-text-editor.tsx                Tiptap wrapper
  moderation-queue.tsx                Moderation queue component
  role-manager.tsx                    Role/permission management UI
```

## Future Phases (not in MVP)

1. **Translation:** Post translation via GPT-4o-mini, DM translation, configurable languages per stake.
2. **Direct Messages:** Member-to-member messaging with translation support.
3. **Recording Angel API:** Hono + Bun + Postgres (NeonDB + Drizzle). Real-time speech-to-text translation for live meetings.
4. **Live Visit Feature:** WebRTC session management, join codes, transcript archival.
5. **Ward Visitation:** Enhanced visiting experience beyond read-only.
6. **Comments:** Comment system with same moderation pipeline.
7. **Polls & Forms:** Interactive post types with voting and form submissions.
8. **Remotion:** Media/video content support.
