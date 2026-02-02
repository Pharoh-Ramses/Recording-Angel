# GospelSmarts

## What This Is

GospelSmarts is a multi-ward, multi-language platform where church leaders publish announcements and lesson plans once, and members read them in their preferred language. It focuses on consistent communication across stakes and wards while keeping member identity portable when they move.

## Core Value

Leaders can publish once and members can reliably read it in their language.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Leaders can authenticate via WorkOS email/password.
- [ ] Members and leaders can access /en and /es routes with automatic locale redirection.
- [ ] Orgs (stakes/wards) define supported languages and scope shared insights within their org.

### Out of Scope

- Global cross-org sharing — keep content scoped to ward/stake for v1.
- Sacrament talk assistant templates — needs domain research first.

## Context

- Planned monorepo with pnpm, Next.js App Router (apps/web), Convex (packages/backend), and shared UI components (packages/ui).
- Internationalization with next-intl and locale-based routing (/en, /es).
- WorkOS for authentication; Convex for data and sync of users.
- Future AI workflows via n8n for translation/enrichment, but not required for v1.

## Constraints

- **Languages**: English and Spanish — initial locale support.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| WorkOS email/password auth | Centralized, managed auth for leaders/members | — Pending |
| v1 languages = English + Spanish | Matches initial audience and routing goals | — Pending |
| Sharing scoped to ward/stake | Keep content relevant and reduce moderation scope | — Pending |

---
*Last updated: 2026-02-01 after initialization*
