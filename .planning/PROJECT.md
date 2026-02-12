# GospelSmarts

## What This Is

GospelSmarts is a multi-ward, multi-language platform where church leaders publish announcements and lesson plans once, and members read them in their preferred language. It ships with WorkOS authentication, org hierarchy (stakes/wards with language configuration), and member enrollment. The platform keeps member identity portable when they move between wards.

## Core Value

Leaders can publish once and members can reliably read it in their language.

## Requirements

### Validated

- ✓ User can log in with email/password via WorkOS — v1.0
- ✓ User receives email verification after signup — v1.0
- ✓ User can reset password via email link — v1.0
- ✓ Stake leader can create a stake — v1.0
- ✓ Ward leader can create a ward under a stake — v1.0
- ✓ Stake or ward can set supported languages (English/Spanish) — v1.0
- ✓ Member can search for a stake — v1.0
- ✓ Member can search for a ward — v1.0
- ✓ Member can join a ward and stake — v1.0

### Active

(None yet — defined during next milestone)

### Out of Scope

- Global cross-org sharing — keep content scoped to ward/stake
- Sacrament talk assistant templates — needs domain research first

## Context

- pnpm monorepo with Turborepo (apps/web, packages/backend, packages/ui)
- Next.js 16 App Router with TypeScript 5, Tailwind v4
- WorkOS AuthKit for authentication (middleware + withAuth pattern)
- Convex for backend data (stakes, wards, memberships, users)
- Convex schema in shared package for cross-app type reuse
- shadcn/ui for component library
- 4,816 LOC TypeScript/CSS shipped in v1.0

## Constraints

- **Languages**: English and Spanish — initial locale support
- **UI Stack**: Tailwind CSS + shadcn/ui — consistent styling and components

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| WorkOS email/password auth | Centralized, managed auth for leaders/members | ✓ Good |
| v1 languages = English + Spanish | Matches initial audience and routing goals | — Pending |
| Sharing scoped to ward/stake | Keep content relevant and reduce moderation scope | — Pending |
| Tailwind + shadcn/ui | Consistent component system for web UI | ✓ Good |
| Shared Convex schema package | Enables type reuse across apps | ✓ Good |
| No AuthKitProvider needed | authkit-nextjs uses middleware pattern, not React context | ✓ Good |
| Two-layer auth protection | Middleware catches early, page guard ensures user context | ✓ Good |
| Turbo Repo for monorepo | Build caching, parallel task execution, standardized pipeline | ✓ Good |
| Keep WorkOS default emails | Satisfies verification/reset without custom email implementation | ✓ Good |
| Root scripts delegate via pnpm -C | Keeps root scripts minimal and focused | ✓ Good |

---
*Last updated: 2026-02-11 after v1.0 milestone*
