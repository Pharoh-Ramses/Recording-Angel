---
phase: 01-authentication-access
plan: 04
subsystem: auth
tags: [workos, authkit, nextjs, middleware, protected-routes]

# Dependency graph
requires:
  - phase: 01-03
    provides: "AuthKit provider and auth-aware home page with withAuth() helper"
provides:
  - AuthKit callback route for OAuth code exchange
  - Protected route middleware using authkitMiddleware()
  - Dashboard page with authentication guard
  - Sign-out server action
affects:
  - "Phase 2: Org Structure (protected leader pages)"
  - "Any authenticated routes"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Middleware-based auth protection (matcher config for selective routes)"
    - "Server component auth guard with withAuth() redirect pattern"
    - "Server actions for sign-out (use server directive)"

key-files:
  created:
    - "apps/web/app/auth/callback/route.ts - AuthKit callback handler using handleAuth()"
    - "apps/web/middleware.ts - AuthKit middleware with matcher for /dashboard/*"
    - "apps/web/app/dashboard/page.tsx - Protected dashboard with user info and sign-out"
  modified: []

key-decisions:
  - "Use matcher config to limit middleware to /dashboard/:path* (avoid static assets)"
  - "Server component pattern: withAuth() → redirect if no user → render protected content"

patterns-established:
  - "Protected routes: middleware.ts + page.tsx withAuth() guard (two-layer protection)"
  - "Server action sign-out: async form action with 'use server' directive"

# Metrics
duration: 1min
completed: 2026-02-02
---

# Phase 1 Plan 4: AuthKit Callback and Protected Dashboard Summary

**AuthKit callback route for OAuth exchange, middleware-based session protection on /dashboard, and protected dashboard page with sign-out**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-02T04:55:22Z
- **Completed:** 2026-02-02T04:56:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- AuthKit callback route at `/auth/callback` exchanges auth codes for session cookies
- Middleware enforces authentication on `/dashboard/:path*` via `authkitMiddleware()`
- Dashboard page uses `withAuth()` server helper to redirect unauthenticated users to sign-in
- Signed-in users see their email and can sign out via server action

## Task Commits

Each task was committed atomically:

1. **Task 1: Add AuthKit callback route** - `07a8007` (feat)
2. **Task 2: Enforce session protection on /dashboard** - `fb1b1bc` (feat)

**Plan metadata:** (to be committed)

## Files Created/Modified
- `apps/web/app/auth/callback/route.ts` - AuthKit callback handler using `handleAuth()` from @workos-inc/authkit-nextjs
- `apps/web/middleware.ts` - AuthKit middleware with matcher config limiting to `/dashboard/:path*`
- `apps/web/app/dashboard/page.tsx` - Protected dashboard page with `withAuth()` guard and sign-out form

## Decisions Made
- Used matcher config to avoid running middleware on static assets (CSS, JS, images)
- Implemented two-layer protection: middleware catches requests early, page-level `withAuth()` ensures correct user context

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Next.js 16 deprecation warning: middleware file convention is deprecated, suggesting proxy pattern instead. Current implementation works correctly; can migrate to proxy pattern in future if needed.

## User Setup Required

**External services require manual configuration.** See [01-authentication-access-USER-SETUP.md](./01-authentication-access-USER-SETUP.md) for:
- WorkOS environment variables (WORKOS_API_KEY, WORKOS_CLIENT_ID, etc.)
- Dashboard configuration (redirect URI)
- Verification commands

## Next Phase Readiness
- Authentication flow is complete and ready for integration testing
- Protected page pattern established for future authenticated routes
- Ready for Phase 2: Org Structure & Languages (can protect leader pages using same pattern)

---
*Phase: 01-authentication-access*
*Completed: 2026-02-02*
