# Polls Feature — Design Document

**Goal:** Add in-app polling to posts so ward/stake members can vote on decisions, schedule preferences, and gather community input.

**Scope:** Polls only (no forms). Single-choice, anonymous results, optional close date. Results visible only after voting.

## Data Model

### New Tables

**`pollOptions`**
| Field | Type | Purpose |
|-------|------|---------|
| `postId` | `Id<"posts">` | Parent poll post |
| `label` | `string` | Option text |
| `position` | `number` | Display order (0-indexed) |

Indexes: `byPostId` on `[postId]`

**`pollVotes`**
| Field | Type | Purpose |
|-------|------|---------|
| `postId` | `Id<"posts">` | Parent poll post |
| `optionId` | `Id<"pollOptions">` | Chosen option |
| `memberId` | `Id<"members">` | Voter |

Indexes: `byPostIdAndMemberId` on `[postId, memberId]` (enforces one vote), `byOptionId` on `[optionId]` (count votes)

### Modified Tables

**`posts`**
- Add `"poll"` to the `type` union
- Add optional `pollCloseDate: v.optional(v.string())` — ISO date string

## Backend

### Post Creation Changes

The `posts.create` mutation gains:
- `pollOptions: v.optional(v.array(v.string()))` — required when `type === "poll"`, min 2, max 6 options
- `pollCloseDate: v.optional(v.string())` — optional close date

After inserting the post, insert each option into `pollOptions` with sequential `position` values.

### New Module: `convex/polls.ts`

| Function | Type | Args | Purpose |
|----------|------|------|---------|
| `vote` | mutation | `postId`, `optionId` | Validates membership, poll approved, not expired, not already voted. Inserts `pollVotes` row. |
| `getOptions` | query | `postId` | Returns all options for a poll, sorted by position. |
| `myVote` | query | `postId` | Returns current member's vote (optionId) or null. Determines whether to show voting UI or results. |
| `getResults` | query | `postId` | Returns options with vote counts and total. Called after member has voted or poll is expired. |

### Moderation

No changes to the moderation pipeline. Polls go through the same AI screening as other posts. The AI screens title + content + option labels (passed as part of the post content or appended for context).

### Translation

The translation action is updated to also translate poll option labels. When translating a poll post, fetch `pollOptions`, translate each label, and store translated labels in a new field on `postTranslations` (e.g., `pollOptionLabels: string[]` ordered by position).

## UI

### Create Post Dialog

When `type === "poll"` is selected in the create post form:
- Show a dynamic list of text inputs for poll options (min 2, max 6)
- Each option has a remove button (hidden when at minimum 2)
- "Add option" button below the list (hidden when at max 6)
- Optional "Close date" date picker (same pattern as eventDate)
- Tiptap rich text editor remains for the poll's description/context

### PostCard — Poll Rendering

When `post.type === "poll"`, render a `PollCard` inline section below the post content:

**Before voting (member hasn't voted yet):**
- Options displayed as clickable radio-style buttons
- Tap/click an option to cast vote immediately
- Show total vote count and optional close date below options

**After voting (member has already voted):**
- Horizontal bar chart showing percentages and vote counts per option
- Member's chosen option highlighted with a checkmark
- Show total vote count and optional close date

**Expired poll (past close date):**
- Show results to everyone (same as "after voting" view)
- Voting disabled, show "Poll closed" indicator

**Non-members (visitors):**
- See the poll options and total vote count but cannot vote
- Results hidden (since they haven't voted and can't vote)

### Summary Info Line

Below the poll options/results, show:
- Total vote count (e.g., "12 votes")
- Close date if set (e.g., "Closes Mar 5" or "Closed Mar 5")

## What We're NOT Building

- Multi-choice voting (select multiple options)
- Visible voter identities (who voted for what)
- Poll editing after creation
- "Add option" by voters
- Poll-specific permissions (uses existing `post:create`)
- Form builder or external form links
