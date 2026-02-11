# Phase 3: Member Enrollment - Research

**Researched:** 2026-02-10
**Domain:** Convex search, membership management, React search UX
**Confidence:** HIGH

## Summary

This phase adds the ability for authenticated members to search for stakes and wards and join them. The research focuses on four areas: (1) how to implement search/filtering in Convex, (2) the join/enrollment mutation pattern, (3) schema changes needed for correctness, and (4) UI patterns for the search-select-join flow.

The key architectural decision is **client-side filtering vs. Convex full-text search indexes**. Given that stakes and wards are organizational units (likely hundreds, not millions), client-side filtering of the full list is the simplest and most maintainable approach. However, Convex search indexes are cheap to define and provide better typeahead UX with prefix matching, so we recommend adding search indexes on `name` fields as a low-cost improvement.

For the join pattern, a single `memberships.joinWard` mutation that atomically creates both ward and stake memberships (if not already present) is the cleanest approach. Convex mutations are transactional, so duplicate prevention is straightforward with a check-then-insert pattern.

**Primary recommendation:** Add search indexes on `stakes.name` and `wards.name`. Create a `memberships.ts` module with `joinWard` (creates ward + stake memberships atomically), `myMemberships` query, and a `leaveWard` mutation. Add a composite index `by_user_org` on memberships for fast duplicate checking. Use client-side `useState` for the search input with Convex `useQuery` for reactive filtered results.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| convex | ^1.31.6 | Database, search indexes, mutations | Already in project; search indexes are built-in |
| convex-helpers | ^0.1.111 | Custom functions (`userMutation`, `userQuery`) | Already in project; provides auth wrappers |
| convex/react | (part of convex) | `useQuery`, `useMutation` hooks | Already used throughout the app |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React 19 useState | built-in | Search input state management | Controlled input for search query |
| Next.js App Router | 16 | Page routing for `/join` flow | New route(s) for enrollment |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Search index on name | Client-side `.filter()` on full list | Works fine for small datasets; no prefix matching, no relevance ranking. Fine for MVP but search indexes cost nothing extra |
| Single `joinWard` mutation | Separate `joinStake` + `joinWard` mutations | Two round trips, risk of partial state. Single atomic mutation is simpler and safer |
| New `/join` route | Modal on dashboard | Route is better for shareability and clear UX flow |

**Installation:**
No new packages needed. Everything uses existing `convex` and `convex-helpers`.

## Architecture Patterns

### Recommended Project Structure
```
packages/backend/convex/
├── memberships.ts       # NEW: joinWard, leaveWard, myMemberships
├── stakes.ts            # MODIFY: add search query
├── wards.ts             # EXISTING: listByStake already works
├── schema.ts            # MODIFY: add search indexes + composite membership index
└── lib/auth.ts          # EXISTING: userMutation, userQuery

apps/web/app/
├── dashboard/
│   ├── join/
│   │   └── page.tsx     # NEW: Search + join flow (main enrollment page)
│   ├── membership/
│   │   └── page.tsx     # NEW: View current memberships
│   └── page.tsx         # MODIFY: Add join CTA, show membership status
```

### Pattern 1: Convex Full-Text Search Index for Stake/Ward Names
**What:** Define `searchIndex` on the `name` field of `stakes` and `wards` tables. Query with `.withSearchIndex()` for typeahead-style search.
**When to use:** When user types in a search box to find their stake or ward by name.
**Example:**
```typescript
// Source: https://docs.convex.dev/search/text-search

// In schema.ts — add search indexes
stakes: defineTable({
  name: v.string(),
  supportedLanguages: v.array(v.union(v.literal("en"), v.literal("es"))),
  createdBy: v.id("users"),
})
  .searchIndex("search_name", {
    searchField: "name",
  }),

wards: defineTable({
  name: v.string(),
  stakeId: v.id("stakes"),
  supportedLanguages: v.optional(v.array(v.union(v.literal("en"), v.literal("es")))),
  createdBy: v.id("users"),
})
  .index("by_stake", ["stakeId"])
  .searchIndex("search_name", {
    searchField: "name",
    filterFields: ["stakeId"],  // allows filtering wards within a specific stake
  }),
```

```typescript
// In stakes.ts — search query
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    if (args.query.trim() === "") {
      // Return all stakes when no query (for browsing)
      return await ctx.db.query("stakes").collect();
    }
    return await ctx.db
      .query("stakes")
      .withSearchIndex("search_name", (q) => q.search("name", args.query))
      .take(20);
  },
});
```

```typescript
// In wards.ts — search within a stake
export const searchByStake = query({
  args: { stakeId: v.id("stakes"), query: v.string() },
  handler: async (ctx, args) => {
    if (args.query.trim() === "") {
      return await ctx.db
        .query("wards")
        .withIndex("by_stake", (q) => q.eq("stakeId", args.stakeId))
        .collect();
    }
    return await ctx.db
      .query("wards")
      .withSearchIndex("search_name", (q) =>
        q.search("name", args.query).eq("stakeId", args.stakeId),
      )
      .take(20);
  },
});
```

### Pattern 2: Atomic Join Mutation with Duplicate Prevention
**What:** A single mutation that creates both ward membership and stake membership, checking for duplicates first.
**When to use:** When a member clicks "Join" on a ward.
**Example:**
```typescript
// Source: Convex transactional mutations — https://docs.convex.dev/database/writing-data

// In memberships.ts
export const joinWard = userMutation({
  args: { wardId: v.id("wards") },
  handler: async (ctx, args) => {
    const ward = await ctx.db.get(args.wardId);
    if (!ward) throw new Error("Ward not found");

    // Check for existing ward membership
    const existingWard = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", ctx.user._id).eq("orgType", "ward").eq("orgId", args.wardId),
      )
      .unique();

    if (existingWard) {
      throw new Error("You are already a member of this ward");
    }

    // Create ward membership
    await ctx.db.insert("memberships", {
      userId: ctx.user._id,
      orgType: "ward",
      orgId: args.wardId,
      role: "member",
    });

    // Auto-join parent stake if not already a member
    const existingStake = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", ctx.user._id).eq("orgType", "stake").eq("orgId", ward.stakeId),
      )
      .unique();

    if (!existingStake) {
      await ctx.db.insert("memberships", {
        userId: ctx.user._id,
        orgType: "stake",
        orgId: ward.stakeId,
        role: "member",
      });
    }

    return { wardId: args.wardId, stakeId: ward.stakeId };
  },
});
```

### Pattern 3: Reactive Search UI with useQuery
**What:** Use React `useState` for the search term and pass it as an argument to a Convex `useQuery`, which reactively returns results.
**When to use:** For the search input on the join page.
**Example:**
```tsx
// Source: https://docs.convex.dev/client/react

"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@gospelsmarts/backend/convex/_generated/api";

function JoinPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStakeId, setSelectedStakeId] = useState<Id<"stakes"> | null>(null);

  // Reactive search — re-runs automatically as searchQuery changes
  const stakes = useQuery(api.stakes.search, { query: searchQuery });

  // Once a stake is selected, show its wards
  const wards = useQuery(
    api.wards.listByStake,
    selectedStakeId ? { stakeId: selectedStakeId } : "skip",
  );

  const joinWard = useMutation(api.memberships.joinWard);

  // ... render search input, results list, ward selection, join button
}
```

### Anti-Patterns to Avoid
- **Don't create separate join mutations for stake and ward:** Two separate mutations means two network round trips and risk of partial state (joined stake but failed to join ward). Use a single atomic mutation.
- **Don't use `.filter()` for search when a search index exists:** The `.filter()` method does a full table scan. With a search index, Convex uses an efficient inverted index.
- **Don't skip empty-query handling:** When the search input is empty, return all results (or a curated list) instead of searching for an empty string, which may return nothing.
- **Don't forget the `"skip"` pattern for conditional queries:** When `selectedStakeId` is null, pass `"skip"` to `useQuery` to avoid calling the backend with invalid args.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text search / typeahead | Custom JS string matching across all records | Convex `searchIndex` + `.withSearchIndex()` | Built-in prefix matching, BM25 relevance ranking, reactive, handles tokenization |
| Duplicate prevention | Application-level locks or unique constraints | Convex mutations are transactional — check-then-insert is safe | Convex mutations execute in serializable transactions; no race conditions |
| Auth-protected mutations | Manual JWT checking | Existing `userMutation` / `userQuery` wrappers from `convex-helpers` | Already built and tested in `lib/auth.ts` |
| Debounced search | Custom debounce hook | Convex's reactive `useQuery` handles this gracefully | Convex deduplicates and batches subscriptions; extra queries are cheap |

**Key insight:** Convex's transactional mutations eliminate the need for database-level unique constraints or optimistic locking. A simple "query if exists, then insert" pattern inside a mutation is race-condition-free.

## Common Pitfalls

### Pitfall 1: orgId Typed as `v.string()` Not `v.id()`
**What goes wrong:** The existing `memberships.orgId` is `v.string()`, not `v.id("stakes") | v.id("wards")`. This means Convex can't validate that the ID actually references an existing document, and you can't use `ctx.db.get(orgId)` directly without a cast.
**Why it happens:** The schema was designed with a polymorphic `orgType`/`orgId` pattern where the ID could reference different tables.
**How to avoid:** Accept this as a deliberate design choice. Always validate the orgId by fetching the document (e.g., `ctx.db.get(args.wardId)`) BEFORE inserting the membership. Keep the `as Id<"stakes">` cast pattern from the existing code.
**Warning signs:** A membership record pointing to a deleted or non-existent org.

### Pitfall 2: Missing Composite Index for Duplicate Checking
**What goes wrong:** Without a `by_user_org` index on `[userId, orgType, orgId]`, duplicate membership checks require scanning all memberships for a user and then filtering.
**Why it happens:** The current schema only has `by_user` (userId) and `by_org` (orgType, orgId) indexes separately.
**How to avoid:** Add a composite index: `.index("by_user_org", ["userId", "orgType", "orgId"])`. This lets you do an efficient point query to check if a specific user already has a membership to a specific org.
**Warning signs:** Slow mutation performance on the join operation; hitting query limits with many memberships.

### Pitfall 3: Search Index With Empty Query
**What goes wrong:** Calling `.withSearchIndex("search_name", q => q.search("name", ""))` with an empty string returns no results (or unexpected results) because there are no terms to match.
**Why it happens:** Convex search tokenizes the query into terms; an empty string has no terms.
**How to avoid:** Check for empty/whitespace-only queries and fall back to a regular `.query().collect()` (list all) or `.withIndex()` query instead.
**Warning signs:** Search results disappear when the input is cleared.

### Pitfall 4: Not Auto-Joining Parent Stake When Joining a Ward
**What goes wrong:** A member joins a ward but has no stake membership. Queries for "my stake" return nothing even though they're in a ward under that stake.
**Why it happens:** Ward and stake memberships are separate records; joining one doesn't automatically create the other.
**How to avoid:** The `joinWard` mutation should always check and create the parent stake membership in the same transaction.
**Warning signs:** Inconsistent membership state; member shows in ward but not in stake member counts.

### Pitfall 5: Forgetting That Search Results Are Ordered by Relevance, Not Creation Time
**What goes wrong:** Search results appear in a different order than expected (not alphabetical, not by creation date).
**Why it happens:** Convex search returns results ordered by BM25 relevance score. You cannot change this ordering when using `.withSearchIndex()`.
**How to avoid:** Accept relevance ordering for search results (it's what users expect when typing a search query). For the "browse all" fallback (empty query), use a regular query which returns by `_creationTime` or sort client-side alphabetically.
**Warning signs:** Confusing result ordering when the search query is short/common.

## Code Examples

Verified patterns from official sources:

### Schema Changes (search indexes + composite membership index)
```typescript
// Source: https://docs.convex.dev/search/text-search + https://docs.convex.dev/database/reading-data/indexes

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),

  stakes: defineTable({
    name: v.string(),
    supportedLanguages: v.array(v.union(v.literal("en"), v.literal("es"))),
    createdBy: v.id("users"),
  })
    .searchIndex("search_name", {
      searchField: "name",
    }),

  wards: defineTable({
    name: v.string(),
    stakeId: v.id("stakes"),
    supportedLanguages: v.optional(
      v.array(v.union(v.literal("en"), v.literal("es"))),
    ),
    createdBy: v.id("users"),
  })
    .index("by_stake", ["stakeId"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["stakeId"],
    }),

  memberships: defineTable({
    userId: v.id("users"),
    orgType: v.union(v.literal("stake"), v.literal("ward")),
    orgId: v.string(),
    role: v.union(v.literal("leader"), v.literal("member")),
  })
    .index("by_user", ["userId"])
    .index("by_org", ["orgType", "orgId"])
    .index("by_user_org", ["userId", "orgType", "orgId"]),
});
```

### Query: Get Current User's Memberships with Org Details
```typescript
// In memberships.ts
// Source: https://docs.convex.dev/database/reading-data/#join

export const myMemberships = userQuery({
  args: {},
  handler: async (ctx) => {
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect();

    // Resolve org details for each membership
    const results = await Promise.all(
      memberships.map(async (m) => {
        if (m.orgType === "stake") {
          const stake = await ctx.db.get(m.orgId as Id<"stakes">);
          return { ...m, org: stake };
        } else {
          const ward = await ctx.db.get(m.orgId as Id<"wards">);
          const stake = ward ? await ctx.db.get(ward.stakeId) : null;
          return { ...m, org: ward, parentStake: stake };
        }
      }),
    );

    return results.filter((r) => r.org !== null);
  },
});
```

### Mutation: Leave a Ward
```typescript
// In memberships.ts
export const leaveWard = userMutation({
  args: { wardId: v.id("wards") },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", ctx.user._id).eq("orgType", "ward").eq("orgId", args.wardId),
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this ward");
    }

    if (membership.role === "leader") {
      throw new Error("Leaders cannot leave a ward. Transfer leadership first.");
    }

    await ctx.db.delete(membership._id);
  },
});
```

### React UI: Search with Conditional Ward Loading
```tsx
// Source: https://docs.convex.dev/client/react#skipping-queries

"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@gospelsmarts/backend/convex/_generated/api";
import type { Id } from "@gospelsmarts/backend/convex/_generated/dataModel";

export default function JoinPage() {
  const [stakeSearch, setStakeSearch] = useState("");
  const [selectedStakeId, setSelectedStakeId] = useState<Id<"stakes"> | null>(null);

  const stakes = useQuery(api.stakes.search, { query: stakeSearch });
  const wards = useQuery(
    api.wards.listByStake,
    selectedStakeId ? { stakeId: selectedStakeId } : "skip",
  );
  const joinWard = useMutation(api.memberships.joinWard);
  const myMemberships = useQuery(api.memberships.myMemberships);

  const handleJoin = async (wardId: Id<"wards">) => {
    try {
      await joinWard({ wardId });
      // Convex reactivity will auto-update myMemberships
    } catch (err) {
      // Handle error (already a member, ward not found, etc.)
    }
  };

  return (
    // Step 1: Search for stake
    // Step 2: Select stake, show wards
    // Step 3: Click join on a ward
    // Step 4: Show confirmation (myMemberships updates reactively)
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side string filtering | Convex `searchIndex` with prefix matching | Available since Convex full-text search GA | Better relevance, typeahead support, server-side efficiency |
| Fuzzy search matching | Prefix-only matching | Jan 15, 2025 (fuzzy deprecated) | Typo tolerance removed; exact prefix matching only |
| Manual Convex auth checks | `convex-helpers` `customMutation`/`customQuery` | convex-helpers 0.1.x | Cleaner auth patterns with injected `ctx.user` |

**Deprecated/outdated:**
- **Fuzzy search in Convex:** Deprecated after January 15, 2025. Search only does prefix matching on the last term. "stake" won't match "steak".

## Open Questions

Things that couldn't be fully resolved:

1. **Should a member be able to join multiple wards?**
   - What we know: The schema supports it (no uniqueness constraint on userId + orgType="ward"). Church members typically belong to one ward.
   - What's unclear: Whether the app should enforce single-ward membership.
   - Recommendation: For Phase 3, allow multiple ward memberships (simpler). If single-ward is needed, add a check in `joinWard` that removes old ward membership before creating new one. This can be a Phase 3+ enhancement.

2. **Should there be a separate "browse" vs "search" experience?**
   - What we know: With search indexes, empty queries don't return results. We need a fallback.
   - What's unclear: Whether users prefer browsing a list or always searching.
   - Recommendation: Default to showing all stakes (empty query fallback to `stakes.list`). When user types, switch to search results. This gives both experiences.

3. **Should the join page be at `/dashboard/join` or `/join`?**
   - What we know: All existing authenticated pages are under `/dashboard`. The join flow requires authentication.
   - What's unclear: Whether join should feel like a dashboard action or a standalone onboarding flow.
   - Recommendation: Use `/dashboard/join` for consistency with the existing route structure. It's behind auth already.

## Sources

### Primary (HIGH confidence)
- Convex Full Text Search docs: https://docs.convex.dev/search/text-search — search index definition, `.withSearchIndex()` API, prefix matching, limits
- Convex Reading Data docs: https://docs.convex.dev/database/reading-data — index queries, `.withIndex()` API, join patterns
- Convex Indexes docs: https://docs.convex.dev/database/reading-data/indexes — composite indexes, ordering
- Convex Writing Data docs: https://docs.convex.dev/database/writing-data — `db.insert`, `db.delete`, transactional mutations
- Convex React client docs: https://docs.convex.dev/client/react — `useQuery`, `useMutation`, `"skip"` pattern
- Convex Filters docs: https://docs.convex.dev/database/reading-data/filters — `.filter()` usage and performance warnings

### Secondary (MEDIUM confidence)
- Existing codebase patterns: `stakes.ts` `create` mutation (membership creation pattern), `lib/auth.ts` (`userMutation`/`userQuery` wrappers), `ConvexClientProvider.tsx` (auth + Convex integration)

### Tertiary (LOW confidence)
- None — all findings verified against official Convex documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new dependencies
- Architecture: HIGH — patterns verified against official Convex docs, follow existing codebase conventions
- Pitfalls: HIGH — identified from official docs (search empty query behavior, fuzzy deprecation) and codebase analysis (orgId typing, missing composite index)
- Search implementation: HIGH — Convex full-text search docs are comprehensive and current
- Join pattern: HIGH — Convex transactional mutation guarantees verified in official docs

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days — Convex is stable, no major changes expected)
