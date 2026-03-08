# Member Permissions UI — Design

## Overview

Add per-member permission management to the admin members page. Clicking a member row expands an inline panel with permission toggles. System role permissions show as locked; additional permissions are toggleable. A custom overrides role is auto-managed behind the scenes.

## Decisions

- **Granularity:** Permission-level control per member (not role-level)
- **Entry point:** Expand member row inline on the existing members page
- **System roles:** Shown as checked + disabled, labeled with source role name
- **Custom permissions:** Toggleable checkboxes, immediate save (no save button)
- **Backend:** One auto-managed custom role per member, created/updated/deleted as needed

## UI Behavior

Clicking a member row on `/admin/members` expands a panel below it showing all 11 permissions as checkboxes:

- **Locked checkboxes** — Permissions granted by system roles (bishop, bishopric, etc.). Checked and disabled, with a label like "(from bishop)".
- **Toggleable checkboxes** — Permissions not granted by any system role. Toggling on adds to the member's custom overrides role. Toggling off removes it.
- **Human-readable labels** — e.g. "Create posts" instead of `post:create`, "Manage live sessions" instead of `live:manage`.
- **No save button** — Each toggle fires a Convex mutation immediately (optimistic).
- **Collapse** — Clicking the same row again collapses the panel.

## Permission Labels

| Permission              | Label                  |
| ----------------------- | ---------------------- |
| `post:create`           | Create posts           |
| `post:publish_directly` | Publish without review |
| `post:approve`          | Approve posts          |
| `post:promote_to_stake` | Promote to stake       |
| `member:approve`        | Approve members        |
| `member:view`           | View members           |
| `role:manage`           | Manage roles           |
| `moderation:configure`  | Configure moderation   |
| `comment:create`        | Create comments        |
| `comment:moderate`      | Moderate comments      |
| `live:manage`           | Manage live sessions   |

## Backend

### New query: `roles.memberPermissionDetails`

```
Args: { memberId: Id<"members"> }
Returns: {
  systemPermissions: { permission: string, fromRole: string }[],
  customPermissions: string[],
}
```

Fetches all roles for a member. System role permissions returned with their source role name. Custom role permissions returned as a flat array.

### New mutation: `roles.setMemberPermissions`

```
Args: { memberId: Id<"members">, permissions: string[] }
```

1. Requires `role:manage` on caller
2. Finds existing custom overrides role (name = `"custom:<memberId>"`, `isSystem: false`)
3. If none exists and permissions non-empty: create role + assign
4. If exists: patch permissions array
5. If permissions empty and role exists: unassign + delete role

## Files Changed

- `apps/web/convex/roles.ts` — Add `memberPermissionDetails` query and `setMemberPermissions` mutation
- `apps/web/app/admin/members/page.tsx` — Add expandable row with permission toggles

## No Schema Changes

Uses existing `roles` and `memberRoles` tables. Custom overrides roles are distinguished by `isSystem: false` and naming convention `"custom:<memberId>"`.
