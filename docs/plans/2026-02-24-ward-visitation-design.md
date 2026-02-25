# Ward Visitation — Design Document

**Goal:** Allow any authenticated user in a stake to browse any ward's feed read-only, without joining. Members see full interaction controls in their home ward; visitors see a "Join this ward" CTA.

**Approach:** Pure UI — no schema or backend changes. The existing `posts.listByWard` query already returns approved posts without a membership check. All changes are frontend conditionals.

## Data Flow

No new tables, mutations, or queries. Existing queries used:

- `posts.listByWard({ wardId })` — returns approved posts (no membership check)
- `wards.listByStake({ stakeId })` — sidebar already lists all wards in the stake
- `members.myMembership` — returns all active memberships for the current user; compare against current `wardId` to derive `isMember`
- `members.requestToJoin({ wardId })` — existing mutation for the "Join" CTA

## Membership Detection

The ward feed page already resolves `wardId` from the URL. To determine visitor vs. member status:

1. Query `members.myMembership` (already returns all memberships enriched with ward data)
2. Check if any membership has `wardId === currentWard._id` and `status === "active"`
3. Derive `isMember: boolean` and `membershipStatus: "active" | "pending" | "inactive" | null`
4. Thread `isMember` through: ward page -> Feed -> PostCard -> ReplyDialog / CommentSheet

## UI Changes

### Left Sidebar (`left-sidebar.tsx`)
- Add a "Home" badge next to wards where the user has active membership
- Current ward highlight (existing dot indicator) stays as-is

### Ward Feed Page (`page.tsx`)
- When `!isMember`: hide `CreatePostBar`, show a join banner instead
- Join banner: ward name, "You're visiting [Ward Name]" message, "Request to Join" button
- When membership status is `"pending"`: button shows "Request Pending" (disabled)

### Feed Component (`feed.tsx`)
- Accept `isMember` prop, pass down to `PostCard`

### PostCard (`post-card.tsx`)
- Accept `isMember` prop
- When `!isMember`: hide the comment/reply button (or make it non-functional with a tooltip)
- Upvote, repost, share buttons: keep visible but non-functional for now (they're already placeholder)

### ReplyDialog (`reply-dialog.tsx`)
- No changes needed — if comment button is hidden on PostCard, the dialog is unreachable

### CommentSheet (`comment-sheet.tsx`)
- Accept `isMember` prop
- When `!isMember`: hide the comment input textarea, show "Join this ward to comment"

## Edge Cases

- **Pending membership**: User already requested to join. Show "Request Pending" instead of "Request to Join"
- **Inactive (rejected) membership**: User was previously rejected. Show "Request to Join" (existing `requestToJoin` mutation doesn't handle re-requests — throws "Already requested or member"). Need to update `requestToJoin` to allow re-requesting when status is `"inactive"`.
- **Mobile**: Join banner must be visible on mobile (no sidebar). Render it in the feed page directly, above the feed.

## What We're NOT Building

- No visit tracking or analytics
- No visitor notifications to ward admins
- No cross-stake visitation
- No special visitor permissions or roles
- No visitor membership records
