# Member Permissions UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add per-member permission toggles to the admin members page, with auto-managed custom roles behind the scenes.

**Architecture:** Two new Convex functions (`memberPermissionDetails` query, `setMemberPermissions` mutation) and an expandable permission panel on the existing members page. System role permissions show as locked; custom permissions are toggleable with immediate save.

**Tech Stack:** Convex (query + mutation), React, shadcn/ui (Checkbox from radix), Tailwind.

---

### Task 1: Add `memberPermissionDetails` query to Convex

**Files:**

- Modify: `apps/web/convex/roles.ts`

**Step 1: Add the query**

Add this query to the end of `apps/web/convex/roles.ts`:

```typescript
export const memberPermissionDetails = query({
  args: { memberId: v.id("members") },
  handler: async (ctx, { memberId }) => {
    const member = await ctx.db.get(memberId);
    if (!member) throw new Error("Member not found");

    const assignments = await ctx.db
      .query("memberRoles")
      .withIndex("byMemberId", (q) => q.eq("memberId", memberId))
      .collect();

    const systemPermissions: { permission: string; fromRole: string }[] = [];
    const customPermissions: string[] = [];

    for (const assignment of assignments) {
      const role = await ctx.db.get(assignment.roleId);
      if (!role) continue;

      if (role.isSystem) {
        for (const perm of role.permissions) {
          systemPermissions.push({ permission: perm, fromRole: role.name });
        }
      } else {
        customPermissions.push(...role.permissions);
      }
    }

    return { systemPermissions, customPermissions };
  },
});
```

**Step 2: Commit**

```bash
git add apps/web/convex/roles.ts
git commit -m "feat: add memberPermissionDetails query"
```

---

### Task 2: Add `setMemberPermissions` mutation to Convex

**Files:**

- Modify: `apps/web/convex/roles.ts`

**Step 1: Add the mutation**

Add this mutation to the end of `apps/web/convex/roles.ts`:

```typescript
export const setMemberPermissions = mutation({
  args: {
    memberId: v.id("members"),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, { memberId, permissions }) => {
    const member = await ctx.db.get(memberId);
    if (!member) throw new Error("Member not found");

    // Require role:manage permission
    const admin = await getAuthenticatedMember(ctx, member.wardId);
    if (!admin) throw new Error("Not authenticated");
    await requirePermission(ctx, admin._id, "role:manage");

    // Validate permissions
    for (const p of permissions) {
      if (!ALL_PERMISSIONS.includes(p as any)) {
        throw new Error(`Invalid permission: ${p}`);
      }
    }

    // Find existing custom overrides role for this member
    const customRoleName = `custom:${memberId}`;
    const allRoles = await ctx.db
      .query("roles")
      .withIndex("byWardId", (q) => q.eq("wardId", member.wardId))
      .collect();
    const existingCustomRole = allRoles.find(
      (r) => !r.isSystem && r.name === customRoleName,
    );

    if (permissions.length === 0) {
      // Remove custom role if it exists
      if (existingCustomRole) {
        const assignment = await ctx.db
          .query("memberRoles")
          .withIndex("byMemberId", (q) => q.eq("memberId", memberId))
          .filter((q) => q.eq(q.field("roleId"), existingCustomRole._id))
          .unique();
        if (assignment) {
          await ctx.db.delete(assignment._id);
        }
        await ctx.db.delete(existingCustomRole._id);
      }
      return;
    }

    if (existingCustomRole) {
      // Update existing custom role permissions
      await ctx.db.patch(existingCustomRole._id, { permissions });
    } else {
      // Create new custom role and assign it
      const roleId = await ctx.db.insert("roles", {
        name: customRoleName,
        wardId: member.wardId,
        permissions,
        isSystem: false,
        level: "ward",
      });
      await ctx.db.insert("memberRoles", { memberId, roleId });
    }
  },
});
```

**Step 2: Commit**

```bash
git add apps/web/convex/roles.ts
git commit -m "feat: add setMemberPermissions mutation for custom overrides"
```

---

### Task 3: Add Checkbox component from shadcn/ui

**Files:**

- Create: `apps/web/components/ui/checkbox.tsx`

**Step 1: Install the checkbox component**

Run: `cd apps/web && bunx shadcn@latest add checkbox`

If that doesn't work, create the component manually. Check if it already exists first:

```bash
ls apps/web/components/ui/checkbox.tsx
```

If it doesn't exist, create it following the shadcn pattern used by the other ui components in that directory.

**Step 2: Commit**

```bash
git add apps/web/components/ui/checkbox.tsx
git commit -m "chore: add shadcn checkbox component"
```

---

### Task 4: Update members page with expandable permission panel

**Files:**

- Modify: `apps/web/app/admin/members/page.tsx`

**Step 1: Add permission labels map and PermissionPanel component**

Add a `PERMISSION_LABELS` map and a `PermissionPanel` component to the file. The panel:

- Uses `api.roles.memberPermissionDetails` to fetch system vs custom permissions
- Uses `api.roles.setMemberPermissions` to toggle custom permissions
- Shows all 11 permissions as checkboxes
- System role permissions: checked + disabled, with "(from role)" label
- Custom permissions: toggleable, fires mutation on change

Add expandable row behavior:

- Track `expandedMemberId` state in `MembersContent`
- Click a member row to toggle expansion
- When expanded, render `<PermissionPanel>` below the row

The permission labels map:

```typescript
const PERMISSION_LABELS: Record<string, string> = {
  "post:create": "Create posts",
  "post:publish_directly": "Publish without review",
  "post:approve": "Approve posts",
  "post:promote_to_stake": "Promote to stake",
  "member:approve": "Approve members",
  "member:view": "View members",
  "role:manage": "Manage roles",
  "moderation:configure": "Configure moderation",
  "comment:create": "Create comments",
  "comment:moderate": "Moderate comments",
  "live:manage": "Manage live sessions",
};
```

The PermissionPanel component:

```typescript
function PermissionPanel({ memberId, wardId }: { memberId: Id<"members">; wardId: Id<"wards"> }) {
  const details = useQuery(api.roles.memberPermissionDetails, { memberId });
  const setPermissions = useMutation(api.roles.setMemberPermissions);
  const permissions = useQuery(api.roles.myPermissions, { wardId });
  const canManage = permissions?.includes("role:manage");

  if (!details) return <div className="px-3 py-4 text-sm text-muted-foreground">Loading...</div>;

  const systemPermSet = new Set(details.systemPermissions.map((sp) => sp.permission));
  const customPermSet = new Set(details.customPermissions);

  const systemPermSource = new Map<string, string>();
  for (const sp of details.systemPermissions) {
    if (!systemPermSource.has(sp.permission)) {
      systemPermSource.set(sp.permission, sp.fromRole);
    }
  }

  async function handleToggle(perm: string, checked: boolean) {
    const newCustom = checked
      ? [...details!.customPermissions, perm]
      : details!.customPermissions.filter((p) => p !== perm);
    await setPermissions({ memberId, permissions: newCustom });
  }

  return (
    <div className="px-3 py-4 border-t border-border bg-muted/30">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Permissions
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ALL_PERMISSIONS.map((perm) => {
          const fromSystem = systemPermSet.has(perm);
          const fromCustom = customPermSet.has(perm);
          const isChecked = fromSystem || fromCustom;
          const isDisabled = fromSystem || !canManage;
          const source = systemPermSource.get(perm);

          return (
            <label
              key={perm}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                isDisabled ? "opacity-60 cursor-default" : "cursor-pointer hover:bg-accent/50",
              )}
            >
              <Checkbox
                checked={isChecked}
                disabled={isDisabled}
                onCheckedChange={(checked) => handleToggle(perm, !!checked)}
              />
              <span>{PERMISSION_LABELS[perm] ?? perm}</span>
              {source && (
                <span className="text-xs text-muted-foreground ml-auto">
                  from {source}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
```

Import `ALL_PERMISSIONS` from `@/convex/lib/permissions` (or inline the array -- check if the import works from the app directory). Import `Checkbox` from `@/components/ui/checkbox`. Import `cn` from `@/lib/utils`.

Make the member row clickable:

```typescript
// In MembersContent, add state:
const [expandedMemberId, setExpandedMemberId] = useState<Id<"members"> | null>(null);

// Make the member row div clickable:
<div
  key={member._id}
  className="rounded-lg border border-border overflow-hidden"
>
  <div
    className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/30 transition-colors"
    onClick={() => setExpandedMemberId(
      expandedMemberId === member._id ? null : member._id
    )}
  >
    {/* existing member row content */}
  </div>
  {expandedMemberId === member._id && (
    <PermissionPanel memberId={member._id} wardId={wardId} />
  )}
</div>
```

**Step 2: Verify types**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: No type errors.

**Step 3: Commit**

```bash
git add apps/web/app/admin/members/page.tsx
git commit -m "feat: add expandable permission panel to admin members page"
```

---

### Task 5: Verify full build

**Step 1: Type check**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: No type errors.

**Step 2: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix type errors in member permissions UI"
```
