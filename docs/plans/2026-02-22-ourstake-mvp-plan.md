# ourStake MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the core web app with auth, real-time feed, and moderation for a single-stake LDS community pilot.

**Architecture:** Convex-native real-time with Clerk auth. All data and business logic in Convex. Next.js App Router for UI with shadcn/ui components and Tiptap rich text. URL-driven state for shareability.

**Tech Stack:** Next.js 16, Convex, Clerk, Tailwind CSS, shadcn/ui, Tiptap, OpenAI GPT-4o-mini, Turborepo, Bun

**Design Doc:** `docs/plans/2026-02-22-ourstake-mvp-design.md`

---

## Phase 1: Foundation Setup

### Task 1: Install Core Dependencies

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/next.config.js`

**Step 1: Install Convex, Clerk, and Tailwind dependencies**

```bash
cd apps/web
bun add convex @clerk/nextjs @clerk/backend svix
```

**Step 2: Install Tiptap**

```bash
cd apps/web
bun add @tiptap/react @tiptap/starter-kit @tiptap/pm
```

**Step 3: Install OpenAI SDK**

```bash
cd apps/web
bun add openai
```

**Step 4: Initialize shadcn/ui (installs Tailwind automatically)**

```bash
cd apps/web
bunx --bun shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Slate
- CSS variables: Yes

**Step 5: Add core shadcn components**

```bash
cd apps/web
bunx --bun shadcn@latest add button card input textarea form dialog dropdown-menu badge avatar separator tabs select toast sheet
```

**Step 6: Initialize Convex**

```bash
cd apps/web
npx convex dev
```

When prompted:
- Log in via GitHub
- Create a new project named "ourstake"
- This creates `apps/web/convex/` directory and `apps/web/.env.local`

Stop the dev server after initialization (Ctrl+C).

**Step 7: Add `.env.local` to `.gitignore` if not already present**

Verify `apps/web/.gitignore` includes `.env.local`. It should from the Next.js template.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: install core dependencies (Convex, Clerk, shadcn, Tiptap, OpenAI)"
```

---

### Task 2: Configure Clerk + Convex Providers

**Files:**
- Create: `apps/web/app/providers.tsx`
- Modify: `apps/web/app/layout.tsx`
- Create: `apps/web/convex/auth.config.ts`

**Step 1: Create Convex auth config**

Create `apps/web/convex/auth.config.ts`:

```typescript
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
```

**Step 2: Create the providers wrapper**

Create `apps/web/app/providers.tsx`:

```typescript
"use client";

import { ReactNode } from "react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

**Step 3: Update root layout**

Replace `apps/web/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "ourStake",
  description: "Community platform for stakes and wards",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**Step 4: Set up Clerk environment variables**

Add to `apps/web/.env.local` (get values from Clerk Dashboard):

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

Set in **Convex Dashboard** (Settings > Environment Variables):

```
CLERK_JWT_ISSUER_DOMAIN=https://your-clerk-domain.clerk.accounts.dev
```

**Step 5: Verify providers load**

```bash
cd apps/web && bun run dev
```

Confirm the app loads without errors at `http://localhost:3000`. Stop the server.

**Step 6: Commit**

```bash
git add apps/web/app/providers.tsx apps/web/app/layout.tsx apps/web/convex/auth.config.ts
git commit -m "feat: configure Clerk + Convex providers"
```

---

### Task 3: Define Convex Schema

**Files:**
- Create: `apps/web/convex/schema.ts`

**Step 1: Write the complete schema**

Create `apps/web/convex/schema.ts`:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users synced from Clerk via webhook
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
  }).index("byClerkId", ["clerkId"]),

  // Stakes (top-level org)
  stakes: defineTable({
    name: v.string(),
    slug: v.string(),
    languages: v.array(v.string()),
    settings: v.object({}),
  }).index("bySlug", ["slug"]),

  // Wards within a stake
  wards: defineTable({
    name: v.string(),
    slug: v.string(),
    stakeId: v.id("stakes"),
    settings: v.object({}),
  })
    .index("bySlug", ["slug"])
    .index("byStakeId", ["stakeId"]),

  // Ward membership
  members: defineTable({
    userId: v.id("users"),
    wardId: v.id("wards"),
    stakeId: v.id("stakes"),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("inactive")
    ),
  })
    .index("byUserId", ["userId"])
    .index("byWardId", ["wardId"])
    .index("byWardIdAndStatus", ["wardId", "status"])
    .index("byUserIdAndWardId", ["userId", "wardId"]),

  // Roles per ward
  roles: defineTable({
    name: v.string(),
    wardId: v.optional(v.id("wards")),
    stakeId: v.optional(v.id("stakes")),
    permissions: v.array(v.string()),
    isSystem: v.boolean(),
    level: v.union(v.literal("ward"), v.literal("stake")),
  })
    .index("byWardId", ["wardId"])
    .index("byStakeId", ["stakeId"]),

  // Member-role assignments
  memberRoles: defineTable({
    memberId: v.id("members"),
    roleId: v.id("roles"),
  })
    .index("byMemberId", ["memberId"])
    .index("byRoleId", ["roleId"]),

  // Posts (core content)
  posts: defineTable({
    authorId: v.id("members"),
    wardId: v.id("wards"),
    stakeId: v.id("stakes"),
    scope: v.union(v.literal("ward"), v.literal("stake")),
    type: v.union(
      v.literal("announcement"),
      v.literal("event"),
      v.literal("classifieds")
    ),
    title: v.string(),
    content: v.string(), // Tiptap JSON stringified
    status: v.union(
      v.literal("draft"),
      v.literal("pending_review"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    moderationNotes: v.optional(v.string()),
    // Event-specific fields
    eventDate: v.optional(v.string()),
    eventLocation: v.optional(v.string()),
  })
    .index("byWardIdAndStatus", ["wardId", "status"])
    .index("byStakeIdAndScopeAndStatus", ["stakeId", "scope", "status"])
    .index("byAuthorId", ["authorId"]),

  // AI moderation settings per ward/stake
  moderationSettings: defineTable({
    wardId: v.optional(v.id("wards")),
    stakeId: v.optional(v.id("stakes")),
    level: v.union(v.literal("ward"), v.literal("stake")),
    aiPrompt: v.string(),
    autoApproveTypes: v.array(v.string()),
  })
    .index("byWardId", ["wardId"])
    .index("byStakeId", ["stakeId"]),
});
```

**Step 2: Push schema to Convex**

```bash
cd apps/web && npx convex dev
```

Verify schema syncs without errors. Stop the server.

**Step 3: Commit**

```bash
git add apps/web/convex/schema.ts
git commit -m "feat: define Convex schema for stakes, wards, members, posts, roles, moderation"
```

---

## Phase 2: Auth & User Sync

### Task 4: Clerk Webhook Handler

**Files:**
- Create: `apps/web/convex/users.ts`
- Create: `apps/web/convex/http.ts`

**Step 1: Write user sync mutations**

Create `apps/web/convex/users.ts`:

```typescript
import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

export const upsertFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
        imageUrl: args.imageUrl,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", args);
  },
});

export const deleteByClerkId = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});
```

**Step 2: Write HTTP webhook handler**

Create `apps/web/convex/http.ts`:

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { WebhookEvent } from "@clerk/backend";
import { Webhook } from "svix";

const http = httpRouter();

http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateClerkWebhook(request);
    if (!event) {
      return new Response("Invalid webhook signature", { status: 400 });
    }

    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const { id, first_name, last_name, email_addresses, image_url } =
          event.data;
        await ctx.runMutation(internal.users.upsertFromClerk, {
          clerkId: id,
          name: `${first_name ?? ""} ${last_name ?? ""}`.trim() || "Anonymous",
          email: email_addresses[0]?.email_address ?? "",
          imageUrl: image_url ?? undefined,
        });
        break;
      }
      case "user.deleted": {
        const clerkId = event.data.id;
        if (clerkId) {
          await ctx.runMutation(internal.users.deleteByClerkId, { clerkId });
        }
        break;
      }
    }

    return new Response(null, { status: 200 });
  }),
});

async function validateClerkWebhook(
  req: Request
): Promise<WebhookEvent | null> {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) throw new Error("Missing CLERK_WEBHOOK_SECRET");

  const payload = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  };

  try {
    return new Webhook(secret).verify(payload, headers) as WebhookEvent;
  } catch {
    return null;
  }
}

export default http;
```

**Step 3: Configure Clerk webhook in dashboard**

In Clerk Dashboard > Webhooks > Add Endpoint:
- URL: `https://<your-convex-deployment>.convex.site/clerk-users-webhook`
- Events: `user.created`, `user.updated`, `user.deleted`
- Copy signing secret

In Convex Dashboard > Settings > Environment Variables:
```
CLERK_WEBHOOK_SECRET=whsec_...
```

**Step 4: Verify webhook syncs**

Run `npx convex dev` and create a test user via Clerk. Check Convex Dashboard data tab for the new user record.

**Step 5: Commit**

```bash
git add apps/web/convex/users.ts apps/web/convex/http.ts
git commit -m "feat: Clerk webhook handler for user sync to Convex"
```

---

### Task 5: Membership System

**Files:**
- Create: `apps/web/convex/members.ts`
- Create: `apps/web/convex/lib/permissions.ts`

**Step 1: Write the permissions helper**

Create `apps/web/convex/lib/permissions.ts`:

```typescript
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export const ALL_PERMISSIONS = [
  "post:create",
  "post:publish_directly",
  "post:approve",
  "post:promote_to_stake",
  "member:approve",
  "member:view",
  "role:manage",
  "moderation:configure",
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export async function getMemberPermissions(
  ctx: QueryCtx,
  memberId: Id<"members">
): Promise<Set<Permission>> {
  const assignments = await ctx.db
    .query("memberRoles")
    .withIndex("byMemberId", (q) => q.eq("memberId", memberId))
    .collect();

  const permissions = new Set<Permission>();

  for (const assignment of assignments) {
    const role = await ctx.db.get(assignment.roleId);
    if (role) {
      for (const perm of role.permissions) {
        permissions.add(perm as Permission);
      }
    }
  }

  return permissions;
}

export async function hasPermission(
  ctx: QueryCtx,
  memberId: Id<"members">,
  permission: Permission
): Promise<boolean> {
  const perms = await getMemberPermissions(ctx, memberId);
  return perms.has(permission);
}

export async function requirePermission(
  ctx: QueryCtx | MutationCtx,
  memberId: Id<"members">,
  permission: Permission
): Promise<void> {
  const has = await hasPermission(ctx as QueryCtx, memberId, permission);
  if (!has) {
    throw new Error(`Missing permission: ${permission}`);
  }
}

export async function getAuthenticatedMember(
  ctx: QueryCtx,
  wardId?: Id<"wards">
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) return null;

  if (wardId) {
    const member = await ctx.db
      .query("members")
      .withIndex("byUserIdAndWardId", (q) =>
        q.eq("userId", user._id).eq("wardId", wardId)
      )
      .unique();
    return member?.status === "active" ? member : null;
  }

  // Return first active membership
  const members = await ctx.db
    .query("members")
    .withIndex("byUserId", (q) => q.eq("userId", user._id))
    .collect();
  return members.find((m) => m.status === "active") ?? null;
}
```

**Step 2: Write membership mutations and queries**

Create `apps/web/convex/members.ts`:

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { hasPermission } from "./lib/permissions";

export const requestToJoin = mutation({
  args: {
    wardId: v.id("wards"),
  },
  handler: async (ctx, { wardId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    // Check not already a member
    const existing = await ctx.db
      .query("members")
      .withIndex("byUserIdAndWardId", (q) =>
        q.eq("userId", user._id).eq("wardId", wardId)
      )
      .unique();
    if (existing) throw new Error("Already requested or member of this ward");

    const ward = await ctx.db.get(wardId);
    if (!ward) throw new Error("Ward not found");

    const memberId = await ctx.db.insert("members", {
      userId: user._id,
      wardId,
      stakeId: ward.stakeId,
      status: "pending",
    });

    // Assign default "member" role
    const memberRole = await ctx.db
      .query("roles")
      .withIndex("byWardId", (q) => q.eq("wardId", wardId))
      .filter((q) => q.eq(q.field("name"), "member"))
      .unique();

    if (memberRole) {
      await ctx.db.insert("memberRoles", {
        memberId,
        roleId: memberRole._id,
      });
    }

    return memberId;
  },
});

export const approveMember = mutation({
  args: {
    memberId: v.id("members"),
  },
  handler: async (ctx, { memberId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const targetMember = await ctx.db.get(memberId);
    if (!targetMember) throw new Error("Member not found");

    // Find the approver's membership in same ward
    const user = await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const approverMember = await ctx.db
      .query("members")
      .withIndex("byUserIdAndWardId", (q) =>
        q.eq("userId", user._id).eq("wardId", targetMember.wardId)
      )
      .unique();
    if (!approverMember || approverMember.status !== "active") {
      throw new Error("Not an active member of this ward");
    }

    const canApprove = await hasPermission(
      ctx,
      approverMember._id,
      "member:approve"
    );
    if (!canApprove) throw new Error("Missing permission: member:approve");

    await ctx.db.patch(memberId, { status: "active" });
  },
});

export const rejectMember = mutation({
  args: {
    memberId: v.id("members"),
  },
  handler: async (ctx, { memberId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const targetMember = await ctx.db.get(memberId);
    if (!targetMember) throw new Error("Member not found");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const approverMember = await ctx.db
      .query("members")
      .withIndex("byUserIdAndWardId", (q) =>
        q.eq("userId", user._id).eq("wardId", targetMember.wardId)
      )
      .unique();
    if (!approverMember || approverMember.status !== "active") {
      throw new Error("Not an active member of this ward");
    }

    const canApprove = await hasPermission(
      ctx,
      approverMember._id,
      "member:approve"
    );
    if (!canApprove) throw new Error("Missing permission: member:approve");

    await ctx.db.patch(memberId, { status: "inactive" });
  },
});

export const pendingMembers = query({
  args: { wardId: v.id("wards") },
  handler: async (ctx, { wardId }) => {
    const pending = await ctx.db
      .query("members")
      .withIndex("byWardIdAndStatus", (q) =>
        q.eq("wardId", wardId).eq("status", "pending")
      )
      .collect();

    // Enrich with user data
    return Promise.all(
      pending.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        return { ...member, user };
      })
    );
  },
});

export const myMembership = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const memberships = await ctx.db
      .query("members")
      .withIndex("byUserId", (q) => q.eq("userId", user._id))
      .collect();

    // Enrich with ward and stake data
    return Promise.all(
      memberships.map(async (m) => {
        const ward = await ctx.db.get(m.wardId);
        const stake = await ctx.db.get(m.stakeId);
        return { ...m, ward, stake };
      })
    );
  },
});
```

**Step 3: Commit**

```bash
git add apps/web/convex/members.ts apps/web/convex/lib/permissions.ts
git commit -m "feat: membership system with join requests and permission-gated approval"
```

---

### Task 6: Role Seeding

**Files:**
- Create: `apps/web/convex/roles.ts`
- Create: `apps/web/convex/seed.ts`

**Step 1: Write role queries and mutations**

Create `apps/web/convex/roles.ts`:

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  ALL_PERMISSIONS,
  getMemberPermissions,
  requirePermission,
  getAuthenticatedMember,
} from "./lib/permissions";

export const listForWard = query({
  args: { wardId: v.id("wards") },
  handler: async (ctx, { wardId }) => {
    return await ctx.db
      .query("roles")
      .withIndex("byWardId", (q) => q.eq("wardId", wardId))
      .collect();
  },
});

export const myPermissions = query({
  args: { wardId: v.optional(v.id("wards")) },
  handler: async (ctx, { wardId }) => {
    const member = await getAuthenticatedMember(ctx, wardId);
    if (!member) return [];
    const perms = await getMemberPermissions(ctx, member._id);
    return Array.from(perms);
  },
});

export const createCustomRole = mutation({
  args: {
    name: v.string(),
    wardId: v.id("wards"),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, { name, wardId, permissions }) => {
    const member = await getAuthenticatedMember(ctx, wardId);
    if (!member) throw new Error("Not a member of this ward");
    await requirePermission(ctx, member._id, "role:manage");

    // Validate permissions
    for (const p of permissions) {
      if (!ALL_PERMISSIONS.includes(p as any)) {
        throw new Error(`Invalid permission: ${p}`);
      }
    }

    return await ctx.db.insert("roles", {
      name,
      wardId,
      permissions,
      isSystem: false,
      level: "ward",
    });
  },
});

export const assignRole = mutation({
  args: {
    memberId: v.id("members"),
    roleId: v.id("roles"),
  },
  handler: async (ctx, { memberId, roleId }) => {
    const targetMember = await ctx.db.get(memberId);
    if (!targetMember) throw new Error("Member not found");

    const assigner = await getAuthenticatedMember(ctx, targetMember.wardId);
    if (!assigner) throw new Error("Not a member of this ward");
    await requirePermission(ctx, assigner._id, "role:manage");

    // Check not already assigned
    const existing = await ctx.db
      .query("memberRoles")
      .withIndex("byMemberId", (q) => q.eq("memberId", memberId))
      .filter((q) => q.eq(q.field("roleId"), roleId))
      .unique();

    if (existing) throw new Error("Role already assigned");

    return await ctx.db.insert("memberRoles", { memberId, roleId });
  },
});
```

**Step 2: Write seed function for initial stake/ward/roles**

Create `apps/web/convex/seed.ts`:

```typescript
import { internalMutation } from "./_generated/server";
import { ALL_PERMISSIONS } from "./lib/permissions";

const WARD_SYSTEM_ROLES = [
  {
    name: "bishop",
    permissions: [...ALL_PERMISSIONS],
  },
  {
    name: "bishopric",
    permissions: [
      "post:create",
      "post:publish_directly",
      "post:approve",
      "member:approve",
    ],
  },
  {
    name: "clerk",
    permissions: ["post:create", "post:publish_directly", "member:view"],
  },
  {
    name: "member",
    permissions: ["post:create"],
  },
];

const STAKE_SYSTEM_ROLES = [
  {
    name: "stake_president",
    permissions: [...ALL_PERMISSIONS],
  },
  {
    name: "stake_clerk",
    permissions: ["post:create", "post:publish_directly"],
  },
];

export const seedStakeAndWards = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existingStakes = await ctx.db.query("stakes").collect();
    if (existingStakes.length > 0) {
      console.log("Already seeded, skipping.");
      return;
    }

    // Create stake
    const stakeId = await ctx.db.insert("stakes", {
      name: "Example Stake",
      slug: "example-stake",
      languages: ["en", "es"],
      settings: {},
    });

    // Create stake-level roles
    for (const role of STAKE_SYSTEM_ROLES) {
      await ctx.db.insert("roles", {
        ...role,
        stakeId,
        isSystem: true,
        level: "stake",
      });
    }

    // Create wards
    const wardNames = [
      { name: "1st Ward", slug: "1st-ward" },
      { name: "2nd Ward", slug: "2nd-ward" },
      { name: "3rd Ward", slug: "3rd-ward" },
    ];

    for (const ward of wardNames) {
      const wardId = await ctx.db.insert("wards", {
        name: ward.name,
        slug: ward.slug,
        stakeId,
        settings: {},
      });

      // Create ward-level system roles
      for (const role of WARD_SYSTEM_ROLES) {
        await ctx.db.insert("roles", {
          ...role,
          wardId,
          isSystem: true,
          level: "ward",
        });
      }

      // Create default moderation settings
      await ctx.db.insert("moderationSettings", {
        wardId,
        level: "ward",
        aiPrompt:
          "You are a content moderator for a church community platform. Review the following post and determine if it is appropriate. Posts should be respectful, relevant to the community, and free of spam or inappropriate content. Respond with JSON: {\"decision\": \"approve\" | \"reject\" | \"needs_review\", \"reason\": \"brief explanation\"}",
        autoApproveTypes: [],
      });
    }

    console.log("Seed complete: 1 stake, 3 wards with roles and moderation settings.");
  },
});
```

**Step 3: Run the seed**

```bash
cd apps/web && npx convex run seed:seedStakeAndWards
```

Verify in Convex Dashboard that stakes, wards, roles, and moderation settings were created.

**Step 4: Commit**

```bash
git add apps/web/convex/roles.ts apps/web/convex/seed.ts
git commit -m "feat: role system with seeding for stake, wards, and system roles"
```

---

## Phase 3: Feed System

### Task 7: Post Mutations

**Files:**
- Create: `apps/web/convex/posts.ts`

**Step 1: Write post creation and query functions**

Create `apps/web/convex/posts.ts`:

```typescript
import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import {
  getAuthenticatedMember,
  hasPermission,
  requirePermission,
} from "./lib/permissions";
import { paginationOptsValidator } from "convex/server";

export const create = mutation({
  args: {
    wardId: v.id("wards"),
    type: v.union(
      v.literal("announcement"),
      v.literal("event"),
      v.literal("classifieds")
    ),
    title: v.string(),
    content: v.string(),
    eventDate: v.optional(v.string()),
    eventLocation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const member = await getAuthenticatedMember(ctx, args.wardId);
    if (!member) throw new Error("Not an active member of this ward");

    const canPublishDirectly = await hasPermission(
      ctx,
      member._id,
      "post:publish_directly"
    );

    const postId = await ctx.db.insert("posts", {
      authorId: member._id,
      wardId: args.wardId,
      stakeId: member.stakeId,
      scope: "ward",
      type: args.type,
      title: args.title,
      content: args.content,
      status: canPublishDirectly ? "approved" : "pending_review",
      eventDate: args.eventDate,
      eventLocation: args.eventLocation,
    });

    // If post needs review, schedule AI moderation
    if (!canPublishDirectly) {
      await ctx.scheduler.runAfter(0, internal.moderation.aiScreen, {
        postId,
      });
    }

    return postId;
  },
});

export const listByWard = query({
  args: {
    wardId: v.id("wards"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { wardId, paginationOpts }) => {
    const results = await ctx.db
      .query("posts")
      .withIndex("byWardIdAndStatus", (q) =>
        q.eq("wardId", wardId).eq("status", "approved")
      )
      .order("desc")
      .paginate(paginationOpts);

    // Enrich with author data
    const enrichedPage = await Promise.all(
      results.page.map(async (post) => {
        const member = await ctx.db.get(post.authorId);
        const user = member ? await ctx.db.get(member.userId) : null;
        return { ...post, author: user };
      })
    );

    return { ...results, page: enrichedPage };
  },
});

export const listByStake = query({
  args: {
    stakeId: v.id("stakes"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { stakeId, paginationOpts }) => {
    const results = await ctx.db
      .query("posts")
      .withIndex("byStakeIdAndScopeAndStatus", (q) =>
        q
          .eq("stakeId", stakeId)
          .eq("scope", "stake")
          .eq("status", "approved")
      )
      .order("desc")
      .paginate(paginationOpts);

    const enrichedPage = await Promise.all(
      results.page.map(async (post) => {
        const member = await ctx.db.get(post.authorId);
        const user = member ? await ctx.db.get(member.userId) : null;
        const ward = await ctx.db.get(post.wardId);
        return { ...post, author: user, ward };
      })
    );

    return { ...results, page: enrichedPage };
  },
});

export const getById = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    if (!post || post.status !== "approved") return null;

    const member = await ctx.db.get(post.authorId);
    const user = member ? await ctx.db.get(member.userId) : null;
    const ward = await ctx.db.get(post.wardId);
    const stake = await ctx.db.get(post.stakeId);

    return { ...post, author: user, ward, stake };
  },
});

export const promoteToStake = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    if (!post) throw new Error("Post not found");

    const member = await getAuthenticatedMember(ctx, post.wardId);
    if (!member) throw new Error("Not a member");
    await requirePermission(ctx, member._id, "post:promote_to_stake");

    await ctx.db.patch(postId, { scope: "stake" });
  },
});
```

**Step 2: Commit**

```bash
git add apps/web/convex/posts.ts
git commit -m "feat: post CRUD with pagination, author enrichment, and stake promotion"
```

---

### Task 8: Moderation Pipeline

**Files:**
- Create: `apps/web/convex/moderation.ts`

**Step 1: Write AI screening action and moderation mutations**

Create `apps/web/convex/moderation.ts`:

```typescript
import { v } from "convex/values";
import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthenticatedMember, requirePermission } from "./lib/permissions";
import OpenAI from "openai";
import { paginationOptsValidator } from "convex/server";

// AI screening action (runs async after post creation)
export const aiScreen = internalAction({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    // Fetch post
    const post = await ctx.runQuery(internal.moderation.getPostForScreening, {
      postId,
    });
    if (!post || post.status !== "pending_review") return;

    // Fetch moderation settings for this ward
    const settings = await ctx.runQuery(
      internal.moderation.getModerationSettings,
      { wardId: post.wardId }
    );

    // Check auto-approve
    if (settings?.autoApproveTypes.includes(post.type)) {
      await ctx.runMutation(internal.moderation.updatePostStatus, {
        postId,
        status: "approved",
        moderationNotes: "Auto-approved by type setting",
      });
      return;
    }

    // Call OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt =
      settings?.aiPrompt ??
      'Review this post for appropriateness in a church community. Respond with JSON: {"decision": "approve" | "reject" | "needs_review", "reason": "brief explanation"}';

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
          {
            role: "user",
            content: `Title: ${post.title}\n\nContent: ${post.content}\n\nPost type: ${post.type}`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 200,
      });

      const result = JSON.parse(
        response.choices[0]?.message?.content ?? '{"decision":"needs_review","reason":"Failed to parse AI response"}'
      );

      const decision = result.decision as string;
      const reason = result.reason as string;

      if (decision === "approve") {
        await ctx.runMutation(internal.moderation.updatePostStatus, {
          postId,
          status: "approved",
          moderationNotes: `AI approved: ${reason}`,
        });
      } else if (decision === "reject") {
        await ctx.runMutation(internal.moderation.updatePostStatus, {
          postId,
          status: "rejected",
          moderationNotes: `AI rejected: ${reason}`,
        });
      }
      // "needs_review" — stays as pending_review for manual queue
    } catch (error) {
      console.error("AI moderation failed, leaving for manual review:", error);
      // On AI failure, leave as pending_review for manual review
    }
  },
});

// Internal helpers
export const getPostForScreening = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    return await ctx.db.get(postId);
  },
});

export const getModerationSettings = query({
  args: { wardId: v.id("wards") },
  handler: async (ctx, { wardId }) => {
    return await ctx.db
      .query("moderationSettings")
      .withIndex("byWardId", (q) => q.eq("wardId", wardId))
      .unique();
  },
});

export const updatePostStatus = internalMutation({
  args: {
    postId: v.id("posts"),
    status: v.union(
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("pending_review")
    ),
    moderationNotes: v.optional(v.string()),
  },
  handler: async (ctx, { postId, status, moderationNotes }) => {
    await ctx.db.patch(postId, { status, moderationNotes });
  },
});

// Moderation queue (for manual review)
export const pendingPosts = query({
  args: {
    wardId: v.id("wards"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { wardId, paginationOpts }) => {
    const results = await ctx.db
      .query("posts")
      .withIndex("byWardIdAndStatus", (q) =>
        q.eq("wardId", wardId).eq("status", "pending_review")
      )
      .order("desc")
      .paginate(paginationOpts);

    const enrichedPage = await Promise.all(
      results.page.map(async (post) => {
        const member = await ctx.db.get(post.authorId);
        const user = member ? await ctx.db.get(member.userId) : null;
        return { ...post, author: user };
      })
    );

    return { ...results, page: enrichedPage };
  },
});

// Manual moderation actions
export const approvePost = mutation({
  args: {
    postId: v.id("posts"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { postId, notes }) => {
    const post = await ctx.db.get(postId);
    if (!post) throw new Error("Post not found");

    const member = await getAuthenticatedMember(ctx, post.wardId);
    if (!member) throw new Error("Not a member");
    await requirePermission(ctx, member._id, "post:approve");

    await ctx.db.patch(postId, {
      status: "approved",
      moderationNotes: notes ?? "Manually approved",
    });
  },
});

export const rejectPost = mutation({
  args: {
    postId: v.id("posts"),
    notes: v.string(),
  },
  handler: async (ctx, { postId, notes }) => {
    const post = await ctx.db.get(postId);
    if (!post) throw new Error("Post not found");

    const member = await getAuthenticatedMember(ctx, post.wardId);
    if (!member) throw new Error("Not a member");
    await requirePermission(ctx, member._id, "post:approve");

    await ctx.db.patch(postId, {
      status: "rejected",
      moderationNotes: notes,
    });
  },
});

// Moderation settings management
export const getSettings = query({
  args: { wardId: v.id("wards") },
  handler: async (ctx, { wardId }) => {
    return await ctx.db
      .query("moderationSettings")
      .withIndex("byWardId", (q) => q.eq("wardId", wardId))
      .unique();
  },
});

export const updateSettings = mutation({
  args: {
    wardId: v.id("wards"),
    aiPrompt: v.optional(v.string()),
    autoApproveTypes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { wardId, aiPrompt, autoApproveTypes }) => {
    const member = await getAuthenticatedMember(ctx, wardId);
    if (!member) throw new Error("Not a member");
    await requirePermission(ctx, member._id, "moderation:configure");

    const settings = await ctx.db
      .query("moderationSettings")
      .withIndex("byWardId", (q) => q.eq("wardId", wardId))
      .unique();

    if (!settings) throw new Error("Moderation settings not found");

    const updates: Record<string, unknown> = {};
    if (aiPrompt !== undefined) updates.aiPrompt = aiPrompt;
    if (autoApproveTypes !== undefined)
      updates.autoApproveTypes = autoApproveTypes;

    await ctx.db.patch(settings._id, updates);
  },
});
```

**Step 2: Set OpenAI API key in Convex**

In Convex Dashboard > Settings > Environment Variables:
```
OPENAI_API_KEY=sk-...
```

**Step 3: Commit**

```bash
git add apps/web/convex/moderation.ts
git commit -m "feat: AI moderation pipeline with auto-screen, manual queue, and configurable settings"
```

---

### Task 9: Stake & Ward Queries

**Files:**
- Create: `apps/web/convex/stakes.ts`
- Create: `apps/web/convex/wards.ts`

**Step 1: Write stake queries**

Create `apps/web/convex/stakes.ts`:

```typescript
import { v } from "convex/values";
import { query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("stakes").collect();
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("stakes")
      .withIndex("bySlug", (q) => q.eq("slug", slug))
      .unique();
  },
});
```

**Step 2: Write ward queries**

Create `apps/web/convex/wards.ts`:

```typescript
import { v } from "convex/values";
import { query } from "./_generated/server";

export const listByStake = query({
  args: { stakeId: v.id("stakes") },
  handler: async (ctx, { stakeId }) => {
    return await ctx.db
      .query("wards")
      .withIndex("byStakeId", (q) => q.eq("stakeId", stakeId))
      .collect();
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("wards")
      .withIndex("bySlug", (q) => q.eq("slug", slug))
      .unique();
  },
});
```

**Step 3: Commit**

```bash
git add apps/web/convex/stakes.ts apps/web/convex/wards.ts
git commit -m "feat: stake and ward lookup queries"
```

---

## Phase 4: UI Pages

### Task 10: Landing Page & Join Ward Flow

**Files:**
- Modify: `apps/web/app/page.tsx`
- Create: `apps/web/app/join/page.tsx`
- Delete: `apps/web/app/page.module.css`

**Step 1: Replace landing page**

Replace `apps/web/app/page.tsx`:

```typescript
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">ourStake</h1>
      <p className="text-muted-foreground text-center max-w-md">
        A community platform for your stake and ward. Stay connected with
        announcements, events, and more.
      </p>
      <SignedOut>
        <SignInButton mode="modal">
          <Button size="lg">Sign In to Get Started</Button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <Link href="/join">
          <Button size="lg">Go to My Ward</Button>
        </Link>
      </SignedIn>
    </div>
  );
}
```

**Step 2: Create join ward page**

Create `apps/web/app/join/page.tsx`:

```typescript
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Id } from "../../convex/_generated/dataModel";

export default function JoinPage() {
  const router = useRouter();
  const memberships = useQuery(api.members.myMembership);
  const stakes = useQuery(api.stakes.list);
  const requestToJoin = useMutation(api.members.requestToJoin);

  // If user has active membership, redirect to their ward
  const activeMembership = memberships?.find((m) => m.status === "active");
  if (activeMembership?.ward && activeMembership?.stake) {
    router.push(
      `/stake/${activeMembership.stake.slug}/ward/${activeMembership.ward.slug}`
    );
    return null;
  }

  // If user has pending membership, show waiting message
  const pendingMembership = memberships?.find((m) => m.status === "pending");

  async function handleJoin(wardId: Id<"wards">) {
    await requestToJoin({ wardId });
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-8 gap-6">
      <h1 className="text-3xl font-bold">Join a Ward</h1>

      {pendingMembership && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Request Pending</CardTitle>
            <CardDescription>
              Your request to join {pendingMembership.ward?.name} is awaiting
              approval from the bishop.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {!pendingMembership && stakes && (
        <div className="w-full max-w-md space-y-4">
          {stakes.map((stake) => (
            <StakeCard
              key={stake._id}
              stakeId={stake._id}
              stakeName={stake.name}
              onJoin={handleJoin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StakeCard({
  stakeId,
  stakeName,
  onJoin,
}: {
  stakeId: Id<"stakes">;
  stakeName: string;
  onJoin: (wardId: Id<"wards">) => Promise<void>;
}) {
  const wards = useQuery(api.wards.listByStake, { stakeId });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{stakeName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {wards?.map((ward) => (
          <div
            key={ward._id}
            className="flex items-center justify-between rounded-md border p-3"
          >
            <span>{ward.name}</span>
            <Button size="sm" onClick={() => onJoin(ward._id)}>
              Request to Join
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

**Step 3: Delete old CSS module**

```bash
rm apps/web/app/page.module.css
```

**Step 4: Commit**

```bash
git add apps/web/app/page.tsx apps/web/app/join/page.tsx
git rm apps/web/app/page.module.css
git commit -m "feat: landing page and ward join flow"
```

---

### Task 11: Ward Feed Page

**Files:**
- Create: `apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/page.tsx`
- Create: `apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/layout.tsx`
- Create: `apps/web/components/post-card.tsx`
- Create: `apps/web/components/feed.tsx`

**Step 1: Create PostCard component**

Create `apps/web/components/post-card.tsx`:

```typescript
"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
    <Card>
      <CardHeader className="flex flex-row items-start gap-3">
        <Avatar className="h-10 w-10">
          {author?.imageUrl && <AvatarImage src={author.imageUrl} />}
          <AvatarFallback>{initials ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{title}</CardTitle>
            <Badge variant="secondary">{type}</Badge>
            {ward && <Badge variant="outline">{ward.name}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            {author?.name ?? "Unknown"} &middot;{" "}
            {new Date(createdAt).toLocaleDateString()}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </CardContent>
      {type === "event" && (eventDate || eventLocation) && (
        <CardFooter className="text-sm text-muted-foreground gap-4">
          {eventDate && <span>Date: {eventDate}</span>}
          {eventLocation && <span>Location: {eventLocation}</span>}
        </CardFooter>
      )}
    </Card>
  );
}
```

**Step 2: Create Feed component**

Create `apps/web/components/feed.tsx`:

```typescript
"use client";

import { usePaginatedQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { PostCard } from "./post-card";
import { Button } from "@/components/ui/button";
import { Id } from "../convex/_generated/dataModel";

interface FeedProps {
  wardId?: Id<"wards">;
  stakeId?: Id<"stakes">;
  mode: "ward" | "stake";
}

export function Feed({ wardId, stakeId, mode }: FeedProps) {
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
    return <p className="text-center text-muted-foreground py-8">Loading...</p>;
  }

  if (feed.results.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No posts yet. Be the first to share something!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {feed.results.map((post) => (
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
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => feed.loadMore(10)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Create ward layout with nav**

Create `apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/layout.tsx`:

```typescript
"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function WardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ stakeSlug: string; wardSlug: string }>();
  const stake = useQuery(api.stakes.getBySlug, { slug: params.stakeSlug });
  const ward = useQuery(api.wards.getBySlug, { slug: params.wardSlug });
  const permissions = useQuery(api.roles.myPermissions, {
    wardId: ward?._id,
  });

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href={`/stake/${params.stakeSlug}`}>
              <span className="text-sm text-muted-foreground">
                {stake?.name}
              </span>
            </Link>
            <span className="text-sm text-muted-foreground">/</span>
            <span className="font-semibold">{ward?.name}</span>
          </div>
          <div className="flex items-center gap-3">
            {permissions?.includes("post:approve") && (
              <Link href="/moderation">
                <Button variant="outline" size="sm">
                  Moderation
                </Button>
              </Link>
            )}
            <UserButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
```

**Step 4: Create ward feed page**

Create `apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/page.tsx`:

```typescript
"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Feed } from "../../../../components/feed";
import { CreatePostButton } from "../../../../components/create-post-button";

export default function WardFeedPage() {
  const params = useParams<{ stakeSlug: string; wardSlug: string }>();
  const ward = useQuery(api.wards.getBySlug, { slug: params.wardSlug });
  const permissions = useQuery(api.roles.myPermissions, {
    wardId: ward?._id,
  });

  if (!ward) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{ward.name} Feed</h1>
        {permissions?.includes("post:create") && (
          <CreatePostButton wardId={ward._id} />
        )}
      </div>
      <Feed wardId={ward._id} mode="ward" />
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add apps/web/components/post-card.tsx apps/web/components/feed.tsx apps/web/app/stake/
git commit -m "feat: ward feed page with PostCard, Feed component, and ward layout"
```

---

### Task 12: Post Creation Dialog

**Files:**
- Create: `apps/web/components/create-post-button.tsx`
- Create: `apps/web/components/rich-text-editor.tsx`

**Step 1: Create Tiptap rich text editor wrapper**

Create `apps/web/components/rich-text-editor.tsx`:

```typescript
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      },
    },
  });

  return <EditorContent editor={editor} />;
}
```

**Step 2: Create post creation dialog**

Create `apps/web/components/create-post-button.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "./rich-text-editor";

export function CreatePostButton({ wardId }: { wardId: Id<"wards"> }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"announcement" | "event" | "classifieds">(
    "announcement"
  );
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");

  const createPost = useMutation(api.posts.create);

  async function handleSubmit() {
    if (!title.trim() || !content.trim()) return;

    await createPost({
      wardId,
      type,
      title: title.trim(),
      content,
      eventDate: type === "event" ? eventDate : undefined,
      eventLocation: type === "event" ? eventLocation : undefined,
    });

    setTitle("");
    setContent("");
    setType("announcement");
    setEventDate("");
    setEventLocation("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Post</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select
            value={type}
            onValueChange={(v) => setType(v as typeof type)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="announcement">Announcement</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="classifieds">Classifieds</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Post title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Write your post..."
          />

          {type === "event" && (
            <>
              <Input
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
              <Input
                placeholder="Location"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
              />
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Post</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/components/create-post-button.tsx apps/web/components/rich-text-editor.tsx
git commit -m "feat: post creation dialog with Tiptap rich text editor"
```

---

### Task 13: Stake Feed Page

**Files:**
- Create: `apps/web/app/stake/[stakeSlug]/page.tsx`
- Create: `apps/web/app/stake/[stakeSlug]/layout.tsx`

**Step 1: Create stake layout**

Create `apps/web/app/stake/[stakeSlug]/layout.tsx`:

```typescript
"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function StakeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ stakeSlug: string }>();
  const stake = useQuery(api.stakes.getBySlug, { slug: params.stakeSlug });

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href={`/stake/${params.stakeSlug}`}>
            <span className="font-semibold">{stake?.name ?? "..."}</span>
          </Link>
          <UserButton />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
```

**Step 2: Create stake feed page**

Create `apps/web/app/stake/[stakeSlug]/page.tsx`:

```typescript
"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Feed } from "../../../components/feed";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function StakeFeedPage() {
  const params = useParams<{ stakeSlug: string }>();
  const stake = useQuery(api.stakes.getBySlug, { slug: params.stakeSlug });
  const wards = useQuery(api.wards.listByStake, {
    stakeId: stake?._id!,
  });

  if (!stake) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{stake.name}</h1>

      {/* Ward links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Wards</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {wards?.map((ward) => (
            <Link
              key={ward._id}
              href={`/stake/${params.stakeSlug}/ward/${ward.slug}`}
            >
              <Button variant="outline" size="sm">
                {ward.name}
              </Button>
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Stake-level feed */}
      <h2 className="text-lg font-semibold">Stake Announcements</h2>
      <Feed stakeId={stake._id} mode="stake" />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/app/stake/
git commit -m "feat: stake feed page with ward navigation"
```

---

### Task 14: Moderation Dashboard

**Files:**
- Create: `apps/web/app/moderation/page.tsx`
- Create: `apps/web/app/moderation/settings/page.tsx`
- Create: `apps/web/app/moderation/layout.tsx`

**Step 1: Create moderation layout**

Create `apps/web/app/moderation/layout.tsx`:

```typescript
"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ModerationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <span className="font-semibold">Moderation</span>
            <Link href="/moderation">
              <Button variant="ghost" size="sm">
                Queue
              </Button>
            </Link>
            <Link href="/moderation/settings">
              <Button variant="ghost" size="sm">
                Settings
              </Button>
            </Link>
          </div>
          <UserButton />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
```

**Step 2: Create moderation queue page**

Create `apps/web/app/moderation/page.tsx`:

```typescript
"use client";

import { usePaginatedQuery, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";

export default function ModerationPage() {
  const memberships = useQuery(api.members.myMembership);
  const activeMembership = memberships?.find((m) => m.status === "active");

  if (!activeMembership?.ward) {
    return <p className="text-muted-foreground">No active ward membership.</p>;
  }

  return <ModerationQueue wardId={activeMembership.wardId} />;
}

function ModerationQueue({ wardId }: { wardId: Id<"wards"> }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.moderation.pendingPosts,
    { wardId },
    { initialNumItems: 20 }
  );

  const approvePost = useMutation(api.moderation.approvePost);
  const rejectPost = useMutation(api.moderation.rejectPost);

  if (status === "LoadingFirstPage") {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  if (results.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No posts pending review.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Moderation Queue</h1>
      {results.map((post) => (
        <ModerationCard
          key={post._id}
          post={post}
          onApprove={async () => {
            await approvePost({ postId: post._id });
          }}
          onReject={async (notes: string) => {
            await rejectPost({ postId: post._id, notes });
          }}
        />
      ))}
      {status === "CanLoadMore" && (
        <Button variant="outline" onClick={() => loadMore(20)}>
          Load more
        </Button>
      )}
    </div>
  );
}

function ModerationCard({
  post,
  onApprove,
  onReject,
}: {
  post: any;
  onApprove: () => Promise<void>;
  onReject: (notes: string) => Promise<void>;
}) {
  const [rejectNotes, setRejectNotes] = useState("");
  const [showReject, setShowReject] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{post.title}</CardTitle>
          <Badge variant="secondary">{post.type}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          By {post.author?.name ?? "Unknown"} &middot;{" "}
          {new Date(post._creationTime).toLocaleDateString()}
        </p>
        {post.moderationNotes && (
          <p className="text-xs text-orange-600">{post.moderationNotes}</p>
        )}
      </CardHeader>
      <CardContent>
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm" onClick={onApprove}>
          Approve
        </Button>
        {!showReject ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowReject(true)}
          >
            Reject
          </Button>
        ) : (
          <div className="flex gap-2 flex-1">
            <Input
              placeholder="Reason for rejection"
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              className="flex-1"
            />
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onReject(rejectNotes)}
              disabled={!rejectNotes.trim()}
            >
              Confirm
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
```

**Step 3: Create moderation settings page**

Create `apps/web/app/moderation/settings/page.tsx`:

```typescript
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState, useEffect } from "react";

export default function ModerationSettingsPage() {
  const memberships = useQuery(api.members.myMembership);
  const activeMembership = memberships?.find((m) => m.status === "active");

  if (!activeMembership) {
    return <p className="text-muted-foreground">No active ward membership.</p>;
  }

  return <SettingsForm wardId={activeMembership.wardId} />;
}

function SettingsForm({ wardId }: { wardId: any }) {
  const settings = useQuery(api.moderation.getSettings, { wardId });
  const updateSettings = useMutation(api.moderation.updateSettings);
  const permissions = useQuery(api.roles.myPermissions, { wardId });

  const [aiPrompt, setAiPrompt] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings?.aiPrompt) {
      setAiPrompt(settings.aiPrompt);
    }
  }, [settings?.aiPrompt]);

  if (!permissions?.includes("moderation:configure")) {
    return (
      <p className="text-muted-foreground">
        You don't have permission to configure moderation settings.
      </p>
    );
  }

  async function handleSave() {
    await updateSettings({ wardId, aiPrompt });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Moderation Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>AI Review Prompt</CardTitle>
          <CardDescription>
            Customize how the AI reviews posts before they enter the manual
            moderation queue. The AI will use this prompt to evaluate each post.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            rows={8}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Enter AI moderation instructions..."
          />
          <div className="flex items-center gap-3">
            <Button onClick={handleSave}>Save</Button>
            {saved && (
              <span className="text-sm text-green-600">Saved!</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add apps/web/app/moderation/
git commit -m "feat: moderation dashboard with queue and AI prompt settings"
```

---

### Task 15: Member Approval UI

**Files:**
- Create: `apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/members/page.tsx`

**Step 1: Create member management page**

Create `apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/members/page.tsx`:

```typescript
"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function MembersPage() {
  const params = useParams<{ stakeSlug: string; wardSlug: string }>();
  const ward = useQuery(api.wards.getBySlug, { slug: params.wardSlug });
  const pending = useQuery(api.members.pendingMembers, {
    wardId: ward?._id!,
  });
  const permissions = useQuery(api.roles.myPermissions, {
    wardId: ward?._id,
  });

  const approveMember = useMutation(api.members.approveMember);
  const rejectMember = useMutation(api.members.rejectMember);

  if (!ward) return null;

  const canApprove = permissions?.includes("member:approve");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Members</h1>

      {canApprove && pending && pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Pending Requests ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.map((member) => (
              <div
                key={member._id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {member.user?.imageUrl && (
                      <AvatarImage src={member.user.imageUrl} />
                    )}
                    <AvatarFallback>
                      {member.user?.name?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {member.user?.name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.user?.email}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => approveMember({ memberId: member._id })}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => rejectMember({ memberId: member._id })}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {canApprove && pending?.length === 0 && (
        <p className="text-muted-foreground">No pending requests.</p>
      )}
    </div>
  );
}
```

**Step 2: Add members link to ward layout**

In `apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/layout.tsx`, add a "Members" link next to the "Moderation" link (inside the permissions-gated section):

```typescript
{permissions?.includes("member:approve") && (
  <Link href={`/stake/${params.stakeSlug}/ward/${params.wardSlug}/members`}>
    <Button variant="outline" size="sm">
      Members
    </Button>
  </Link>
)}
```

**Step 3: Commit**

```bash
git add apps/web/app/stake/
git commit -m "feat: member approval page for bishops"
```

---

## Phase 5: Final Polish

### Task 16: Clean Up Boilerplate

**Files:**
- Delete: `apps/web/public/turborepo-dark.svg`
- Delete: `apps/web/public/turborepo-light.svg`
- Delete: `apps/web/public/file-text.svg`
- Delete: `apps/web/public/window.svg`
- Delete: `apps/web/public/vercel.svg`
- Delete: `apps/web/public/next.svg`
- Modify: `apps/web/app/globals.css` (keep only Tailwind directives)
- Delete: `packages/ui/src/button.tsx` (replaced by shadcn)
- Delete: `packages/ui/src/card.tsx` (replaced by shadcn)
- Delete: `packages/ui/src/code.tsx` (no longer used)

**Step 1: Remove unused boilerplate assets**

```bash
rm apps/web/public/turborepo-dark.svg apps/web/public/turborepo-light.svg apps/web/public/file-text.svg apps/web/public/window.svg apps/web/public/vercel.svg apps/web/public/next.svg
```

**Step 2: Update globals.css**

Replace `apps/web/app/globals.css` with just the Tailwind imports (shadcn init may have already done this, verify and adjust):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 3: Remove old UI package stubs**

```bash
rm packages/ui/src/button.tsx packages/ui/src/card.tsx packages/ui/src/code.tsx
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove create-turbo boilerplate, clean up for ourStake"
```

---

### Task 17: Verify Full App

**Step 1: Start Convex dev server**

```bash
cd apps/web && npx convex dev
```

**Step 2: Start Next.js dev server (separate terminal)**

```bash
cd apps/web && bun run dev
```

**Step 3: Manual verification checklist**

1. Visit `http://localhost:3000` — landing page loads with sign-in button
2. Sign in via Clerk — redirected to `/join`
3. Select a ward and request to join — see "pending" message
4. In Convex Dashboard, manually set a member's status to "active" and assign "bishop" role for testing
5. Refresh `/join` — redirected to ward feed page
6. Create a post — if bishop role, appears immediately; if member role, enters moderation
7. Visit `/moderation` — see pending posts
8. Approve/reject a post — post appears in or disappears from feed
9. Visit `/moderation/settings` — edit AI prompt
10. Visit stake page — see ward links and stake-level feed
11. Share a ward URL — verify it loads correctly for another user

**Step 4: Fix any issues found during verification**

**Step 5: Final commit if any fixes were needed**

---

## Summary

| Phase | Tasks | What's Built |
|-------|-------|-------------|
| 1: Foundation | 1-3 | Dependencies, providers, schema |
| 2: Auth & Users | 4-6 | Clerk webhook, membership, roles, seeding |
| 3: Feed System | 7-9 | Posts, moderation pipeline, stake/ward queries |
| 4: UI Pages | 10-15 | Landing, join flow, ward feed, stake feed, post creation, moderation dashboard, member approval |
| 5: Polish | 16-17 | Boilerplate cleanup, full verification |

**Total: 17 tasks across 5 phases.**

After this MVP is complete, future phases can add: translation, DMs, Recording Angel API, comments, polls, ward visitation enhancements, and Remotion media support.
