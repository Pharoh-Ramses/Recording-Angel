# Admin Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate all admin functionality (members, moderation, posts, polls, settings) into a unified `/admin?ward=<wardId>` route with sidebar navigation, replacing the disconnected `/moderation` and `/members` pages.

**Architecture:** A dedicated admin layout at `/admin` with a fixed sidebar containing permission-filtered navigation. Ward context is passed via `?ward=wardId` query parameter (same pattern as existing moderation routes). Each admin section is a separate page under `/admin/`. The admin panel is fully separated from the AppShell feed layout. Existing moderation and member management pages are ported into the new structure and old routes are deleted.

**Tech Stack:** Next.js 16 App Router, Convex (backend), Clerk auth, shadcn/ui (Button, Badge, Card, Avatar, Select, Textarea), Lucide React icons, Tailwind CSS v4

---

## Files Changed Summary

| File | Action | Purpose |
|------|--------|---------|
| `convex/wards.ts` | Modify | Add `getById` query |
| `convex/members.ts` | Modify | Add `listActive` query |
| `convex/posts.ts` | Modify | Add `listForAdmin` query |
| `convex/roles.ts` | Modify | Add `unassignRole` mutation |
| `app/admin/layout.tsx` | Create | Admin sidebar layout |
| `app/admin/page.tsx` | Create | Redirect to /admin/members |
| `app/admin/members/page.tsx` | Create | Member list + approval + role mgmt |
| `app/admin/moderation/page.tsx` | Create | Post moderation queue (ported) |
| `app/admin/posts/page.tsx` | Create | All posts with status filters |
| `app/admin/polls/page.tsx` | Create | Pinned poll management (ported) |
| `app/admin/settings/page.tsx` | Create | Moderation settings (ported) |
| `components/left-sidebar.tsx` | Modify | Replace admin links with single Dashboard link |
| `app/moderation/` | Delete | Old route (replaced by /admin) |
| `app/stake/[stakeSlug]/ward/[wardSlug]/members/` | Delete | Old route (replaced by /admin/members) |

---

### Task 1: Backend — Add admin queries and mutations

**Files:**
- Modify: `apps/web/convex/wards.ts`
- Modify: `apps/web/convex/members.ts`
- Modify: `apps/web/convex/posts.ts`
- Modify: `apps/web/convex/roles.ts`

**Step 1: Add `wards.getById` query**

Append to `apps/web/convex/wards.ts`:

```typescript
export const getById = query({
  args: { wardId: v.id("wards") },
  handler: async (ctx, { wardId }) => {
    const ward = await ctx.db.get(wardId);
    if (!ward) return null;
    const stake = await ctx.db.get(ward.stakeId);
    return {
      ...ward,
      stake: stake ? { slug: stake.slug, name: stake.name } : null,
    };
  },
});
```

**Step 2: Add `members.listActive` query**

Add import of `getMemberPermissions` from `./lib/permissions` at the top of `apps/web/convex/members.ts` (alongside existing `hasPermission` import). Then append:

```typescript
export const listActive = query({
  args: { wardId: v.id("wards") },
  handler: async (ctx, { wardId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const admin = await ctx.db
      .query("members")
      .withIndex("byUserIdAndWardId", (q) =>
        q.eq("userId", user._id).eq("wardId", wardId)
      )
      .unique();
    if (!admin || admin.status !== "active") {
      throw new Error("Not an active member");
    }

    const perms = await getMemberPermissions(ctx, admin._id);
    if (!perms.has("member:approve") && !perms.has("member:view")) {
      throw new Error("Missing permission");
    }

    const activeMembers = await ctx.db
      .query("members")
      .withIndex("byWardIdAndStatus", (q) =>
        q.eq("wardId", wardId).eq("status", "active")
      )
      .collect();

    return Promise.all(
      activeMembers.map(async (m) => {
        const memberUser = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("_id"), m.userId))
          .unique();

        const assignments = await ctx.db
          .query("memberRoles")
          .withIndex("byMemberId", (q) => q.eq("memberId", m._id))
          .collect();

        const roles = (
          await Promise.all(
            assignments.map(async (a) => {
              const role = await ctx.db.get(a.roleId);
              return role
                ? { _id: role._id, name: role.name, isSystem: role.isSystem }
                : null;
            })
          )
        ).filter(Boolean);

        return {
          ...m,
          user: memberUser
            ? {
                name: memberUser.name,
                email: memberUser.email,
                imageUrl: memberUser.imageUrl,
              }
            : null,
          roles,
        };
      })
    );
  },
});
```

**Step 3: Add `posts.listForAdmin` query**

Append to `apps/web/convex/posts.ts` (all needed imports already exist at top of file):

```typescript
export const listForAdmin = query({
  args: {
    wardId: v.id("wards"),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("pending_review"),
        v.literal("approved"),
        v.literal("rejected")
      )
    ),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { wardId, status, paginationOpts }) => {
    const member = await getAuthenticatedMember(ctx, wardId);
    if (!member) throw new Error("Not authenticated");
    await requirePermission(ctx, member._id, "post:approve");

    const q = status
      ? ctx.db
          .query("posts")
          .withIndex("byWardIdAndStatus", (q) =>
            q.eq("wardId", wardId).eq("status", status)
          )
      : ctx.db
          .query("posts")
          .withIndex("byWardIdAndStatus", (q) => q.eq("wardId", wardId));

    const results = await q.order("desc").paginate(paginationOpts);

    const enriched = await Promise.all(
      results.page.map(async (post) => {
        const authorMember = await ctx.db.get(post.authorId);
        const authorUser = authorMember
          ? await ctx.db
              .query("users")
              .filter((q) => q.eq(q.field("_id"), authorMember.userId))
              .unique()
          : null;
        return {
          ...post,
          author: authorUser ? { name: authorUser.name } : null,
        };
      })
    );

    return { ...results, page: enriched };
  },
});
```

**Step 4: Add `roles.unassignRole` mutation**

Append to `apps/web/convex/roles.ts` (all needed imports already exist):

```typescript
export const unassignRole = mutation({
  args: {
    memberId: v.id("members"),
    roleId: v.id("roles"),
  },
  handler: async (ctx, { memberId, roleId }) => {
    const member = await ctx.db.get(memberId);
    if (!member) throw new Error("Member not found");

    const admin = await getAuthenticatedMember(ctx, member.wardId);
    if (!admin) throw new Error("Not authenticated");
    await requirePermission(ctx, admin._id, "role:manage");

    const assignment = await ctx.db
      .query("memberRoles")
      .withIndex("byMemberId", (q) => q.eq("memberId", memberId))
      .filter((q) => q.eq(q.field("roleId"), roleId))
      .unique();

    if (assignment) {
      await ctx.db.delete(assignment._id);
    }
  },
});
```

**Step 5: Verify backend compiles**

Run: `cd apps/web && bunx convex dev --once`
Expected: `Convex functions ready!`

**Step 6: Commit**

```bash
git add apps/web/convex/wards.ts apps/web/convex/members.ts apps/web/convex/posts.ts apps/web/convex/roles.ts apps/web/convex/_generated/api.d.ts
git commit -m "feat: add admin backend queries for members, posts, and role management"
```

---

### Task 2: Admin layout with sidebar navigation

**Files:**
- Create: `apps/web/app/admin/layout.tsx`
- Create: `apps/web/app/admin/page.tsx`

**Step 1: Create admin layout**

Create `apps/web/app/admin/layout.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  Users,
  Shield,
  FileText,
  BarChart3,
  Settings,
  ArrowLeft,
} from "lucide-react";

const navItems = [
  {
    href: "/admin/members",
    label: "Members",
    icon: Users,
    permissions: ["member:approve", "member:view"],
  },
  {
    href: "/admin/moderation",
    label: "Moderation",
    icon: Shield,
    permissions: ["post:approve"],
  },
  {
    href: "/admin/posts",
    label: "Posts",
    icon: FileText,
    permissions: ["post:approve"],
  },
  {
    href: "/admin/polls",
    label: "Polls",
    icon: BarChart3,
    permissions: ["post:approve"],
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    permissions: ["moderation:configure"],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const wardId = searchParams.get("ward") as Id<"wards"> | null;

  const ward = useQuery(api.wards.getById, wardId ? { wardId } : "skip");
  const permissions = useQuery(
    api.roles.myPermissions,
    wardId ? { wardId } : "skip"
  );

  if (!wardId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">No ward selected.</p>
      </div>
    );
  }

  const backHref = ward?.stake
    ? `/stake/${ward.stake.slug}/ward/${ward.slug}`
    : "/";

  const visibleNav = navItems.filter((item) =>
    item.permissions.some((p) => permissions?.includes(p))
  );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-background flex flex-col h-screen sticky top-0">
        <div className="p-4 border-b border-border">
          <Link
            href={backHref}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to ward
          </Link>
          <h1 className="font-semibold text-lg truncate">
            {ward?.name ?? "Admin"}
          </h1>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {visibleNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={`${item.href}?ward=${wardId}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <UserButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
```

**Step 2: Create admin overview redirect**

Create `apps/web/app/admin/page.tsx`:

```tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ward = searchParams.get("ward");

  useEffect(() => {
    router.replace(`/admin/members${ward ? `?ward=${ward}` : ""}`);
  }, [ward, router]);

  return null;
}
```

**Step 3: Commit**

```bash
git add apps/web/app/admin/
git commit -m "feat: add admin layout with sidebar navigation"
```

---

### Task 3: Admin members page

**Files:**
- Create: `apps/web/app/admin/members/page.tsx`

**Step 1: Create members page**

Create `apps/web/app/admin/members/page.tsx`:

```tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminMembersPage() {
  const searchParams = useSearchParams();
  const wardId = searchParams.get("ward") as Id<"wards"> | null;

  if (!wardId) {
    return <p className="text-muted-foreground">No ward selected.</p>;
  }

  return <MembersContent wardId={wardId} />;
}

function MembersContent({ wardId }: { wardId: Id<"wards"> }) {
  const pending = useQuery(api.members.pendingMembers, { wardId });
  const active = useQuery(api.members.listActive, { wardId });
  const roles = useQuery(api.roles.listForWard, { wardId });
  const permissions = useQuery(api.roles.myPermissions, { wardId });

  const approveMember = useMutation(api.members.approveMember);
  const rejectMember = useMutation(api.members.rejectMember);
  const assignRole = useMutation(api.roles.assignRole);
  const unassignRole = useMutation(api.roles.unassignRole);

  const canManageRoles = permissions?.includes("role:manage");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Members</h1>

      {/* Pending Requests */}
      {pending && pending.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Pending Requests ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((member) => (
              <div
                key={member._id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.user?.imageUrl} />
                    <AvatarFallback>
                      {member.user?.name?.[0] ?? "?"}
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
          </div>
        </section>
      )}

      {/* Active Members */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          Active Members {active ? `(${active.length})` : ""}
        </h2>
        {active === undefined ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : active.length === 0 ? (
          <p className="text-muted-foreground">No active members.</p>
        ) : (
          <div className="space-y-2">
            {active.map((member) => (
              <div
                key={member._id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.user?.imageUrl} />
                    <AvatarFallback>
                      {member.user?.name?.[0] ?? "?"}
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
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {member.roles.map((role: any) => (
                    <Badge
                      key={role._id}
                      variant={role.isSystem ? "secondary" : "outline"}
                      className="gap-1"
                    >
                      {role.name}
                      {canManageRoles && !role.isSystem && (
                        <button
                          onClick={() =>
                            unassignRole({
                              memberId: member._id,
                              roleId: role._id,
                            })
                          }
                          className="ml-0.5 hover:text-destructive"
                        >
                          x
                        </button>
                      )}
                    </Badge>
                  ))}
                  {canManageRoles && roles && (
                    <RoleAssigner
                      memberId={member._id}
                      currentRoleIds={member.roles.map((r: any) => r._id)}
                      allRoles={roles}
                      onAssign={(roleId) =>
                        assignRole({ memberId: member._id, roleId })
                      }
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RoleAssigner({
  memberId,
  currentRoleIds,
  allRoles,
  onAssign,
}: {
  memberId: Id<"members">;
  currentRoleIds: Id<"roles">[];
  allRoles: any[];
  onAssign: (roleId: Id<"roles">) => void;
}) {
  const available = allRoles.filter((r) => !currentRoleIds.includes(r._id));
  if (available.length === 0) return null;

  return (
    <Select onValueChange={(val) => onAssign(val as Id<"roles">)}>
      <SelectTrigger className="w-28 h-7 text-xs">
        <SelectValue placeholder="Add role" />
      </SelectTrigger>
      <SelectContent>
        {available.map((role) => (
          <SelectItem key={role._id} value={role._id}>
            {role.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/app/admin/members/
git commit -m "feat: add admin members page with approval and role management"
```

---

### Task 4: Admin moderation page

**Files:**
- Create: `apps/web/app/admin/moderation/page.tsx`

**Step 1: Port moderation queue**

Copy the content of `apps/web/app/moderation/page.tsx` to `apps/web/app/admin/moderation/page.tsx`. The code is identical — it already reads `wardId` from `useSearchParams().get("ward")`. No changes needed to the logic.

```tsx
"use client";

import DOMPurify from "isomorphic-dompurify";
import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
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
import { useSearchParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";

export default function AdminModerationPage() {
  const searchParams = useSearchParams();
  const wardId = searchParams.get("ward") as Id<"wards"> | null;

  if (!wardId) {
    return <p className="text-muted-foreground">No ward selected.</p>;
  }

  return <ModerationQueue wardId={wardId} />;
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
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(post.content),
          }}
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

**Step 2: Commit**

```bash
git add apps/web/app/admin/moderation/
git commit -m "feat: add admin moderation page (ported from /moderation)"
```

---

### Task 5: Admin posts page

**Files:**
- Create: `apps/web/app/admin/posts/page.tsx`

**Step 1: Create posts management page**

Create `apps/web/app/admin/posts/page.tsx`:

```tsx
"use client";

import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { label: "All", value: undefined },
  { label: "Approved", value: "approved" as const },
  { label: "Pending", value: "pending_review" as const },
  { label: "Rejected", value: "rejected" as const },
];

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  pending_review:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function AdminPostsPage() {
  const searchParams = useSearchParams();
  const wardId = searchParams.get("ward") as Id<"wards"> | null;

  if (!wardId) {
    return <p className="text-muted-foreground">No ward selected.</p>;
  }

  return <PostsContent wardId={wardId} />;
}

function PostsContent({ wardId }: { wardId: Id<"wards"> }) {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined
  );

  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.listForAdmin,
    { wardId, status: statusFilter as any },
    { initialNumItems: 20 }
  );

  const approvePost = useMutation(api.moderation.approvePost);
  const rejectPost = useMutation(api.moderation.rejectPost);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Posts</h1>

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b border-border">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.label}
            onClick={() => setStatusFilter(filter.value)}
            className={cn(
              "px-3 py-2 text-sm transition-colors border-b-2 -mb-px",
              statusFilter === filter.value
                ? "border-primary text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Post list */}
      {status === "LoadingFirstPage" ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : results.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No posts found.
        </p>
      ) : (
        <div className="space-y-2">
          {results.map((post) => (
            <div
              key={post._id}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium truncate">{post.title}</p>
                  <Badge variant="secondary" className="text-xs">
                    {post.type}
                  </Badge>
                  <span
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full font-medium",
                      STATUS_STYLES[post.status] ?? ""
                    )}
                  >
                    {post.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  By {post.author?.name ?? "Unknown"} &middot;{" "}
                  {new Date(post._creationTime).toLocaleDateString()}
                </p>
              </div>
              {post.status === "pending_review" && (
                <div className="flex gap-2 shrink-0 ml-3">
                  <Button
                    size="sm"
                    onClick={() => approvePost({ postId: post._id })}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      rejectPost({ postId: post._id, notes: "Rejected via admin" })
                    }
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
          {status === "CanLoadMore" && (
            <Button variant="outline" onClick={() => loadMore(20)}>
              Load more
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/app/admin/posts/
git commit -m "feat: add admin posts page with status filters"
```

---

### Task 6: Admin polls page

**Files:**
- Create: `apps/web/app/admin/polls/page.tsx`

**Step 1: Port polls management**

Copy the content of `apps/web/app/moderation/polls/page.tsx` to `apps/web/app/admin/polls/page.tsx`. The code is identical — it already reads `wardId` from search params and uses the same `api.polls.*` queries/mutations. No changes needed.

**Step 2: Commit**

```bash
git add apps/web/app/admin/polls/
git commit -m "feat: add admin polls page (ported from /moderation/polls)"
```

---

### Task 7: Admin settings page

**Files:**
- Create: `apps/web/app/admin/settings/page.tsx`

**Step 1: Port moderation settings**

Copy the content of `apps/web/app/moderation/settings/page.tsx` to `apps/web/app/admin/settings/page.tsx`. Rename the export to `AdminSettingsPage` and update the title to "Settings". The logic is identical — reads `wardId` from search params, checks `moderation:configure` permission.

```tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
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
import { useSearchParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";

export default function AdminSettingsPage() {
  const searchParams = useSearchParams();
  const wardId = searchParams.get("ward") as Id<"wards"> | null;

  if (!wardId) {
    return <p className="text-muted-foreground">No ward selected.</p>;
  }

  return <SettingsContent wardId={wardId} />;
}

function SettingsContent({ wardId }: { wardId: Id<"wards"> }) {
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
        You don&apos;t have permission to configure settings.
      </p>
    );
  }

  async function handleSave() {
    await updateSettings({ wardId: wardId!, aiPrompt });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

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

**Step 2: Commit**

```bash
git add apps/web/app/admin/settings/
git commit -m "feat: add admin settings page (ported from /moderation/settings)"
```

---

### Task 8: Update left sidebar and remove old routes

**Files:**
- Modify: `apps/web/components/left-sidebar.tsx`
- Delete: `apps/web/app/moderation/` (entire directory)
- Delete: `apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/members/` (entire directory)

**Step 1: Update left-sidebar admin links**

In `apps/web/components/left-sidebar.tsx`, replace the entire admin section (lines 158-186) with a single "Dashboard" link to the new admin route. Also add `moderation:configure` to the permission check so settings-only admins see the link too.

Replace:
```tsx
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
            {permissions?.includes("post:approve") && activeWard && (
              <Link
                href={`/moderation?ward=${activeWard._id}`}
                className="flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                <Shield className="h-4 w-4" />
                Moderation
              </Link>
            )}
          </nav>
        </div>
      )}
```

With:
```tsx
      {/* Admin link */}
      {(permissions?.includes("member:approve") ||
        permissions?.includes("post:approve") ||
        permissions?.includes("moderation:configure")) &&
        activeWard && (
          <div className="px-2 pt-6">
            <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Admin
            </p>
            <nav className="space-y-0.5">
              <Link
                href={`/admin?ward=${activeWard._id}`}
                className="flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                <Shield className="h-4 w-4" />
                Dashboard
              </Link>
            </nav>
          </div>
        )}
```

The `Users` icon import can be removed from the import list since it's no longer used in this file.

**Step 2: Delete old moderation routes**

```bash
rm -rf apps/web/app/moderation
```

**Step 3: Delete old members page**

```bash
rm -rf 'apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/members'
```

**Step 4: Verify backend still compiles**

Run: `cd apps/web && bunx convex dev --once`
Expected: `Convex functions ready!`

**Step 5: Verify no broken imports**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -30`
Expected: Only the pre-existing `convex/posts.ts:62` error (string | undefined label), no new errors.

**Step 6: Commit**

```bash
git add apps/web/components/left-sidebar.tsx
git add apps/web/app/moderation
git add 'apps/web/app/stake/[stakeSlug]/ward/[wardSlug]/members'
git commit -m "feat: consolidate admin navigation and remove old moderation routes"
```
