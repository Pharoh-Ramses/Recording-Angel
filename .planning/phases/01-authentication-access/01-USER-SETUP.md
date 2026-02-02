# Phase 01: User Setup Required

**Generated:** 2026-02-02
**Phase:** 01-authentication-access
**Status:** Incomplete

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `WORKOS_API_KEY` | WorkOS Dashboard → API Keys | `.env.local` |
| [ ] | `WORKOS_CLIENT_ID` | WorkOS Dashboard → Project Settings | `.env.local` |
| [ ] | `WORKOS_COOKIE_PASSWORD` | Generate 32+ char secret | `.env.local` |
| [ ] | `WORKOS_REDIRECT_URI` | WorkOS Dashboard → Redirect URIs | `.env.local` |
| [ ] | `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | Same as WORKOS_REDIRECT_URI | `.env.local` |

## Account Setup

### 1. Create WorkOS Account
- Visit: https://workos.com
- Sign up for a free account
- Create a new project

### 2. Generate Cookie Password

Generate a secure 32+ character password for cookie encryption:

```bash
openssl rand -base64 32
```

Copy the output and use it for `WORKOS_COOKIE_PASSWORD`.

## Dashboard Configuration

### Enable AuthKit Email+Password

- [ ] **Enable AuthKit Email+Password and keep default verification/reset emails enabled**
  - Location: WorkOS Dashboard → Authentication → AuthKit
  - Toggle ON: "Email + Password"
  - Keep default verification and password reset emails enabled

### Configure Redirect URIs

- [ ] **Add redirect URI for local development**
  - Location: WorkOS Dashboard → Redirect URIs
  - Add: `http://localhost:3000/auth/callback`
  - Add: `http://localhost:3000` (for local testing)

- [ ] **Add redirect URI for production (when ready)**
  - Location: WorkOS Dashboard → Redirect URIs
  - Add: `https://your-domain.com/auth/callback`

## Local Development

1. Copy the example environment file:
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

2. Fill in all values from the WorkOS Dashboard

3. Start the dev server:
   ```bash
   pnpm -C apps/web dev
   ```

4. Visit http://localhost:3000 and click "Sign up" to test the AuthKit flow

## Verification

After completing setup, verify the integration works:

1. **Env vars are loaded:**
   ```bash
   pnpm -C apps/web dev
   # Should start without "Missing env var" errors
   ```

2. **AuthKit loads correctly:**
   - Visit http://localhost:3000
   - Click "Sign up" link
   - Should redirect to WorkOS AuthKit hosted page

3. **Sign up flow works:**
   - Complete email/password registration on AuthKit
   - Should return to app with session established
   - Home page should show "Welcome, {email}" and Sign out button

4. **Sign out works:**
   - Click "Sign out" button
   - Should return to signed-out view with Log in/Sign up links

---

**Once all items complete:** Mark status as "Complete" and proceed to Plan 01-04.
