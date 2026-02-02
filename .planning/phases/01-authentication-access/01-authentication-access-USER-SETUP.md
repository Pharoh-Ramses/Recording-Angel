# Phase 01: User Setup Required

**Generated:** 2026-02-02
**Phase:** 01-authentication-access
**Status:** Incomplete

## Overview

This phase integrates WorkOS AuthKit for authentication. The following external service configuration is required for the authentication flow to function.

## Service: WorkOS

**Purpose:** AuthKit callback and session protection

### Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `WORKOS_API_KEY` | WorkOS Dashboard → API Keys | `.env.local` |
| [ ] | `WORKOS_CLIENT_ID` | WorkOS Dashboard → Project Settings | `.env.local` |
| [ ] | `WORKOS_COOKIE_PASSWORD` | Generate 32+ char secret (local secret manager) | `.env.local` |
| [ ] | `WORKOS_REDIRECT_URI` | WorkOS Dashboard → Redirect URIs | `.env.local` |

### Dashboard Configuration

- [ ] **Add redirect URI pointing to /auth/callback**
  - Location: WorkOS Dashboard → Redirect URIs
  - Details: Add `http://localhost:3000/auth/callback` for local development, and your production URL (e.g., `https://yourdomain.com/auth/callback`)

### Environment File Template

Create `apps/web/.env.local`:

```bash
# WorkOS AuthKit
WORKOS_API_KEY=sk_test_...
WORKOS_CLIENT_ID=client_...
WORKOS_COOKIE_PASSWORD=your-32-character-secret-here
WORKOS_REDIRECT_URI=http://localhost:3000/auth/callback
```

**Generating a secure cookie password:**
```bash
# Linux/macOS
openssl rand -base64 32

# Or use any secure random string generator (minimum 32 characters)
```

## Local Development

After setting up environment variables:

1. Start the dev server:
   ```bash
   pnpm -C apps/web dev
   ```

2. Visit http://localhost:3000

3. Click "Sign up" to create a test account via WorkOS AuthKit

4. After authentication, you'll be redirected to the home page

5. Visit http://localhost:3000/dashboard to test protected route access

## Verification

Check that authentication works end-to-end:

```bash
# 1. Build succeeds (no TypeScript errors)
pnpm -C apps/web build

# 2. Dashboard route is listed in build output
# Should show: └ ƒ /dashboard

# 3. Middleware is active (shown in build output)
# Should show: ƒ Proxy (Middleware)
```

**Manual verification steps:**
1. Visit http://localhost:3000 (signed-out view with Log in/Sign up buttons)
2. Click "Sign up" and complete WorkOS AuthKit flow
3. After redirect, you should see your email and Sign out button
4. Visit http://localhost:3000/dashboard while signed in (should show dashboard)
5. Sign out and try to visit /dashboard (should redirect to sign-in)

## Troubleshooting

**"Invalid redirect URI" error:**
- Ensure WORKOS_REDIRECT_URI matches exactly what's configured in WorkOS Dashboard
- Include the full URL with protocol: `http://localhost:3000/auth/callback`

**Middleware not protecting routes:**
- Check that matcher config in `middleware.ts` includes your route pattern
- Verify middleware.ts is in the `apps/web/` root (not inside app/)

**Session not persisting:**
- Ensure WORKOS_COOKIE_PASSWORD is at least 32 characters
- Check browser cookies are enabled
- Verify WORKOS_API_KEY has correct permissions

---

**Once all items complete:** Mark status as "Complete"
