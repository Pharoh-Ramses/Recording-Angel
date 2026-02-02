---
phase: 01-authentication-access
plan: 03
subsystem: auth
tags: [workos, authkit, nextjs, authentication]

requires:
  - phase: 01-authentication-access
    provides: Next.js 16 app with TypeScript 5 and Tailwind v4

provides:
  - WorkOS AuthKit dependency installed
  - Environment variable placeholders documented
  - Auth-aware home page with conditional UI
  - Server-side auth check using withAuth()

affects:
  - 01-04 (AuthKit callback and protected dashboard)
  - Any auth-required pages

tech-stack:
  added:
    - "@workos-inc/authkit-nextjs@2.13.0"
  patterns:
    - Server component auth with withAuth()
    - Server action for signOut
    - Async auth URL generation with getSignInUrl/getSignUpUrl

key-files:
  created:
    - apps/web/.env.example
  modified:
    - apps/web/package.json
    - apps/web/app/layout.tsx
    - apps/web/app/page.tsx

key-decisions:
  - "AuthKitProvider doesn't exist in authkit-nextjs - library uses middleware pattern instead"
  - "Removed AuthKitProvider wrapper after discovering package exports"
  - "Using server-side withAuth() instead of client-side provider for session management"

patterns-established:
  - "Server component auth: use withAuth() in async page components"
  - "Auth UI: Conditional render based on user existence"
  - "Sign out: Server action using signOut() from authkit-nextjs"

duration: 2min
completed: 2026-02-02
---

# Phase 1 Plan 3: WorkOS AuthKit Integration Summary

**WorkOS AuthKit dependency installed, .env.example created with required env vars, and auth-aware home page rendering sign-in/up links or sign-out action based on session.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-02T04:51:47Z
- **Completed:** 2026-02-02T04:53:23Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Installed @workos-inc/authkit-nextjs v2.13.0
- Created .env.example with all 5 required WorkOS environment variables
- Built auth-aware home page using withAuth() server helper
- Implemented conditional UI: sign-in/up links for anonymous users, sign-out button for authenticated users

## Task Commits

Each task was committed atomically:

1. **Task 1: Add AuthKit dependency and env example** - `1c6c70d` (chore)
2. **Task 2: Wire AuthKitProvider and auth-aware home page** - `fb3da52` (feat)

**Plan metadata:** [metadata commit follows]

## Files Created/Modified
- `apps/web/package.json` - Added @workos-inc/authkit-nextjs dependency
- `apps/web/.env.example` - Documented all required WorkOS env vars with inline comments
- `apps/web/app/layout.tsx` - Updated title/description to GospelSmarts branding
- `apps/web/app/page.tsx` - Auth-aware home with withAuth(), conditional sign-in/up or sign-out UI

## Decisions Made

**No AuthKitProvider needed** - After attempting to wrap the layout with AuthKitProvider, discovered the authkit-nextjs package doesn't export this component. The library uses a middleware-based approach instead of React context. Removed the provider wrapper and rely on server-side withAuth() for session management.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed non-existent AuthKitProvider import**
- **Found during:** Task 2 (Wiring AuthKitProvider)
- **Issue:** Attempted to import and use AuthKitProvider from @workos-inc/authkit-nextjs, but the package doesn't export this component
- **Fix:** Checked actual package exports (withAuth, getSignInUrl, getSignUpUrl, signOut, authkitMiddleware, etc.), removed AuthKitProvider wrapper from layout.tsx
- **Files modified:** apps/web/app/layout.tsx
- **Verification:** Build succeeded after removing the invalid import
- **Committed in:** fb3da52 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Provider was incorrect assumption; server-side withAuth() is the correct pattern for this library

## Issues Encountered
- Discovered authkit-nextjs doesn't use React Provider pattern - uses middleware instead. Corrected by removing provider and using server-side auth helper.

## User Setup Required

**External services require manual configuration.** See [01-USER-SETUP.md](./01-USER-SETUP.md) for:
- WorkOS environment variables to add
- Dashboard configuration steps (enable AuthKit Email+Password)
- Verification commands

## Next Phase Readiness
- AuthKit dependency ready
- Environment variable template created
- Auth-aware page pattern established
- Ready for Plan 01-04: AuthKit callback and protected dashboard

---
*Phase: 01-authentication-access*
*Completed: 2026-02-02*
