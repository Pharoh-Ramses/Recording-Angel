# Phase 2: Org Structure & Languages - Research

**Researched:** 2026-02-03
**Domain:** Convex database setup, hierarchical org structure (stakes/wards), multi-language support
**Confidence:** HIGH

## Summary

Phase 2 introduces the Convex database layer to enable stake and ward management. This phase requires:
1. Setting up Convex in the existing Next.js + WorkOS monorepo
2. Designing schema for hierarchical org structure (stakes contain wards)
3. Implementing authorization patterns (stake leaders vs ward leaders)
4. Adding language/locale configuration per org

The standard approach is to use Convex's schema system with typed validators, indexes for efficient queries, and custom functions for authorization. WorkOS AuthKit integrates with Convex via JWT tokens through `auth.config.ts`. User documents stored in Convex link to WorkOS identities via `tokenIdentifier`.

**Primary recommendation:** Create a `packages/backend` package containing the Convex schema and functions, with indexes on `stakeId` for wards and `tokenIdentifier` for users. Use custom mutations/queries for authorization checks.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| convex | latest | Database, realtime, serverless functions | Official Convex SDK |
| convex-helpers | latest | Custom functions, RLS utilities | Official helper library from Convex team |
| @convex-dev/workos | latest | WorkOS + Convex integration | Official provider component |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-table | ^8.x | Data table with sorting/filtering | Admin UIs for stake/ward management |
| @workos-inc/authkit-nextjs | ^2.13.0 | Already installed - Auth middleware | Continue using for Next.js auth |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Convex | Supabase, Planetscale | Convex provides realtime sync + serverless functions in one; simpler DX |
| convex-helpers RLS | Custom middleware | RLS provides defense-in-depth; custom is more explicit |

**Installation:**
```bash
# In apps/web
pnpm add convex @convex-dev/workos

# Create packages/backend for shared schema
mkdir -p packages/backend
cd packages/backend
pnpm init
pnpm add convex
```

## Architecture Patterns

### Recommended Project Structure
```
packages/
  backend/
    convex/
      _generated/        # Auto-generated types
      schema.ts          # Database schema
      auth.config.ts     # WorkOS JWT validation
      users.ts           # User CRUD and current user lookup
      stakes.ts          # Stake mutations/queries
      wards.ts           # Ward mutations/queries
      lib/
        auth.ts          # Custom functions with auth checks
        helpers.ts       # Shared helper functions
    package.json
    tsconfig.json
apps/
  web/
    app/
      ConvexClientProvider.tsx  # Convex + WorkOS provider
      (dashboard)/
        stakes/           # Stake management UI
        wards/            # Ward management UI
```

### Pattern 1: Hierarchical Org Schema
**What:** Stakes contain wards; users have memberships linking them to orgs with roles.
**When to use:** Multi-tenant apps with org hierarchy.
**Example:**
```typescript
// Source: Convex schema docs + custom design
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    tokenIdentifier: v.string(), // WorkOS identity link
  }).index("by_token", ["tokenIdentifier"]),

  stakes: defineTable({
    name: v.string(),
    supportedLanguages: v.array(v.union(v.literal("en"), v.literal("es"))),
    createdBy: v.id("users"),
  }),

  wards: defineTable({
    name: v.string(),
    stakeId: v.id("stakes"),
    supportedLanguages: v.optional(v.array(v.union(v.literal("en"), v.literal("es")))),
    createdBy: v.id("users"),
  }).index("by_stake", ["stakeId"]),

  memberships: defineTable({
    userId: v.id("users"),
    orgType: v.union(v.literal("stake"), v.literal("ward")),
    orgId: v.union(v.id("stakes"), v.id("wards")),
    role: v.union(v.literal("leader"), v.literal("member")),
  })
    .index("by_user", ["userId"])
    .index("by_org", ["orgType", "orgId"]),
});
```

### Pattern 2: Custom Functions for Authorization
**What:** Wrap `mutation`/`query` with auth checks using convex-helpers.
**When to use:** Consistent authorization across all endpoints.
**Example:**
```typescript
// Source: Convex authorization docs + convex-helpers
import { customMutation, customQuery } from "convex-helpers/server/customFunctions";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";

// Get current user from WorkOS identity
async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

// Authenticated mutation - requires logged-in user
export const userMutation = customMutation(mutation, {
  args: {},
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthenticated");
    return { ctx: { user }, args };
  },
});

// Stake leader mutation - requires stake leader role
export const stakeLeaderMutation = customMutation(mutation, {
  args: { stakeId: v.id("stakes") },
  input: async (ctx, { stakeId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthenticated");
    
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) => 
        q.eq("orgType", "stake").eq("orgId", stakeId))
      .filter((q) => 
        q.and(q.eq(q.field("userId"), user._id), q.eq(q.field("role"), "leader")))
      .unique();
    
    if (!membership) throw new Error("Not a stake leader");
    return { ctx: { user, stakeId }, args: {} };
  },
});
```

### Pattern 3: Convex + WorkOS AuthKit Integration
**What:** Configure Convex to validate WorkOS JWTs.
**When to use:** Any Convex app using WorkOS for auth.
**Example:**
```typescript
// convex/auth.config.ts
// Source: https://docs.convex.dev/auth/authkit
const clientId = process.env.WORKOS_CLIENT_ID;

const authConfig = {
  providers: [
    {
      type: "customJwt",
      issuer: `https://api.workos.com/`,
      algorithm: "RS256",
      applicationID: clientId,
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
    {
      type: "customJwt",
      issuer: `https://api.workos.com/user_management/${clientId}`,
      algorithm: "RS256",
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
  ],
};

export default authConfig;
```

### Pattern 4: ConvexClientProvider for Next.js + WorkOS
**What:** Client provider that bridges WorkOS auth with Convex.
**When to use:** Any Next.js app using both WorkOS and Convex.
**Example:**
```typescript
// app/ConvexClientProvider.tsx
// Source: https://docs.convex.dev/auth/authkit#nextjs
"use client";

import { ReactNode, useCallback, useRef } from "react";
import { ConvexReactClient, ConvexProviderWithAuth } from "convex/react";
import { AuthKitProvider, useAuth, useAccessToken } from "@workos-inc/authkit-nextjs/components";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <AuthKitProvider>
      <ConvexProviderWithAuth client={convex} useAuth={useAuthFromAuthKit}>
        {children}
      </ConvexProviderWithAuth>
    </AuthKitProvider>
  );
}

function useAuthFromAuthKit() {
  const { user, loading: isLoading } = useAuth();
  const { accessToken, loading: tokenLoading, error: tokenError } = useAccessToken();

  const loading = (isLoading ?? false) || (tokenLoading ?? false);
  const authenticated = !!user && !!accessToken && !loading;

  const stableAccessToken = useRef<string | null>(null);
  if (accessToken && !tokenError) {
    stableAccessToken.current = accessToken;
  }

  const fetchAccessToken = useCallback(async () => {
    if (stableAccessToken.current && !tokenError) {
      return stableAccessToken.current;
    }
    return null;
  }, [tokenError]);

  return {
    isLoading: loading,
    isAuthenticated: authenticated,
    fetchAccessToken,
  };
}
```

### Anti-Patterns to Avoid
- **Skipping user store mutation:** Always call a mutation to store user in Convex DB on first login; JWT fields alone are limited.
- **Querying without indexes:** Always define indexes for fields used in `.withIndex()` queries.
- **Client-side authorization only:** Never rely solely on hiding UI; always check authorization in mutations/queries.
- **Hardcoding roles in schema:** Use a `memberships` join table rather than adding arrays of user IDs to orgs.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth token validation | Custom JWT parsing | Convex auth.config.ts + ctx.auth.getUserIdentity() | Handles JWKS rotation, caching, validation |
| Custom function wrappers | Manual ctx modification | convex-helpers customMutation/customQuery | Type-safe, tested, composable |
| Realtime data sync | WebSocket management | Convex useQuery hook | Automatic subscriptions, caching, retry |
| Row-level security | Per-query auth checks | convex-helpers wrapDatabaseReader/Writer | Consistent enforcement as defense-in-depth |

**Key insight:** Convex handles the hard infrastructure (realtime sync, transactions, subscriptions). Focus authorization logic at the endpoint level using custom functions.

## Common Pitfalls

### Pitfall 1: Missing Index Definition
**What goes wrong:** Query throws error or scans full table.
**Why it happens:** Using `.withIndex()` without defining the index in schema.
**How to avoid:** Always add corresponding `.index()` call in schema.ts when using `.withIndex()`.
**Warning signs:** Slow queries, "index not found" errors during `npx convex dev`.

### Pitfall 2: Circular Reference in Schema
**What goes wrong:** Can't insert documents that reference each other.
**Why it happens:** Convex validates schema on every write.
**How to avoid:** Make one reference nullable, insert in stages, then patch.
**Warning signs:** "Document validation failed" when inserting related documents.

### Pitfall 3: AuthKit Not Syncing with Convex
**What goes wrong:** `ctx.auth.getUserIdentity()` returns null despite user being logged in.
**Why it happens:** Missing or incorrect auth.config.ts, environment variable mismatch.
**How to avoid:** 
1. Verify WORKOS_CLIENT_ID set in Convex dashboard
2. Run `npx convex dev` after changing auth.config.ts
3. Use `useConvexAuth()` not `useAuth()` for checking auth state
**Warning signs:** User appears logged in on client but mutations fail with auth errors.

### Pitfall 4: User Not in Database
**What goes wrong:** Queries expecting user document fail.
**Why it happens:** Didn't call store user mutation after login.
**How to avoid:** Use `useStoreUserEffect` hook pattern to ensure user stored on login.
**Warning signs:** `user` is null despite `isAuthenticated` being true.

### Pitfall 5: Language Array Not Defaulting
**What goes wrong:** Ward inherits null languages instead of stake's languages.
**Why it happens:** Optional field returns undefined, not parent's value.
**How to avoid:** In queries, explicitly fall back: `ward.supportedLanguages ?? stake.supportedLanguages`.
**Warning signs:** UI shows no language options for wards without explicit setting.

## Code Examples

Verified patterns from official sources:

### Store User on Login
```typescript
// Source: https://docs.convex.dev/auth/database-auth
import { mutation } from "./_generated/server";

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Called storeUser without authentication");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (user !== null) {
      // Update if name changed
      if (user.name !== identity.name) {
        await ctx.db.patch(user._id, { name: identity.name ?? "Anonymous" });
      }
      return user._id;
    }

    // Create new user
    return await ctx.db.insert("users", {
      name: identity.name ?? "Anonymous",
      email: identity.email ?? "",
      tokenIdentifier: identity.tokenIdentifier,
    });
  },
});
```

### Create Stake (with authorization)
```typescript
// Source: Custom based on Convex patterns
import { v } from "convex/values";
import { userMutation } from "./lib/auth";

export const create = userMutation({
  args: {
    name: v.string(),
    supportedLanguages: v.array(v.union(v.literal("en"), v.literal("es"))),
  },
  handler: async (ctx, args) => {
    // Create stake
    const stakeId = await ctx.db.insert("stakes", {
      name: args.name,
      supportedLanguages: args.supportedLanguages,
      createdBy: ctx.user._id,
    });

    // Make creator a leader
    await ctx.db.insert("memberships", {
      userId: ctx.user._id,
      orgType: "stake",
      orgId: stakeId,
      role: "leader",
    });

    return stakeId;
  },
});
```

### Create Ward (with stake leader check)
```typescript
// Source: Custom based on Convex patterns
import { v } from "convex/values";
import { stakeLeaderMutation } from "./lib/auth";

export const create = stakeLeaderMutation({
  args: {
    name: v.string(),
    supportedLanguages: v.optional(v.array(v.union(v.literal("en"), v.literal("es")))),
  },
  handler: async (ctx, args) => {
    const wardId = await ctx.db.insert("wards", {
      name: args.name,
      stakeId: ctx.stakeId,
      supportedLanguages: args.supportedLanguages,
      createdBy: ctx.user._id,
    });

    // Make creator a leader of the ward too
    await ctx.db.insert("memberships", {
      userId: ctx.user._id,
      orgType: "ward",
      orgId: wardId,
      role: "leader",
    });

    return wardId;
  },
});
```

### List Wards by Stake
```typescript
// Source: https://docs.convex.dev/database/reading-data/indexes
import { v } from "convex/values";
import { query } from "./_generated/server";

export const listByStake = query({
  args: { stakeId: v.id("stakes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("wards")
      .withIndex("by_stake", (q) => q.eq("stakeId", args.stakeId))
      .collect();
  },
});
```

### Set Supported Languages
```typescript
// Source: Custom based on Convex patterns
import { v } from "convex/values";
import { stakeLeaderMutation } from "./lib/auth";

export const setLanguages = stakeLeaderMutation({
  args: {
    languages: v.array(v.union(v.literal("en"), v.literal("es"))),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(ctx.stakeId, {
      supportedLanguages: args.languages,
    });
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Convex Auth (built-in) | External auth providers (WorkOS, Clerk) | 2024 | More flexibility but requires auth.config.ts setup |
| Single convex/ folder | Monorepo with packages/backend | Current best practice | Shared schema across apps |
| Manual ctx passing | customMutation/customQuery | convex-helpers v0.1+ | Type-safe auth injection |

**Deprecated/outdated:**
- Direct `ctx.db` usage without auth checks in public functions: Now use custom functions
- Storing user data only in JWT claims: Store user document in Convex for relationships

## Open Questions

Things that couldn't be fully resolved:

1. **Convex package location in monorepo**
   - What we know: Convex can run from any directory with proper config
   - What's unclear: Whether to use `packages/backend/convex` or `apps/web/convex`
   - Recommendation: Start with `apps/web/convex` for simplicity; extract to shared package if needed later

2. **Ward leader creating wards independently**
   - What we know: Requirements say "Ward leader can create a ward under a stake"
   - What's unclear: Does ward leader need stake leader approval? Can anyone with ward leader role in ONE ward create more wards?
   - Recommendation: Allow ward creation by anyone authenticated; use stake leader role for managing wards within a stake

## Sources

### Primary (HIGH confidence)
- Convex official docs - Next.js quickstart, schemas, indexes, auth
  - https://docs.convex.dev/quickstart/nextjs
  - https://docs.convex.dev/database/schemas
  - https://docs.convex.dev/database/reading-data/indexes
  - https://docs.convex.dev/auth/authkit
  - https://docs.convex.dev/auth/database-auth
  - https://docs.convex.dev/auth/functions-auth

### Secondary (MEDIUM confidence)
- Convex Stack blog - Authorization patterns
  - https://stack.convex.dev/authorization
  - https://stack.convex.dev/row-level-security

### Tertiary (LOW confidence)
- shadcn/ui Data Table docs - For admin UI patterns
  - https://ui.shadcn.com/docs/components/data-table

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Convex documentation verified
- Architecture: HIGH - Patterns from official docs and examples
- Pitfalls: MEDIUM - Mix of official docs and community knowledge

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (Convex is stable; 30 days reasonable)
