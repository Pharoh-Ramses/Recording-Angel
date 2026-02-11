# Phase 1: Authentication Access - Research

**Researched:** 2026-02-01
**Domain:** WorkOS AuthKit authentication for Next.js App Router
**Confidence:** MEDIUM

## Summary

This phase is best implemented with WorkOS AuthKit hosted authentication (email + password) integrated through the official Next.js App Router SDK. The WorkOS-hosted flow provides sign-in/sign-up UI, session management, email verification, and password reset out of the box, which satisfies the requirements without custom UI or mail handling.

The standard approach in a Next.js App Router app is to add an AuthKit callback route (`handleAuth`), configure a proxy/middleware (`authkitMiddleware`) to protect routes and manage sessions, wrap the app in `AuthKitProvider`, and generate sign-in/sign-up URLs with the SDK. Default WorkOS emails should be kept enabled unless there is a clear requirement for custom email branding or deliverability control.

**Primary recommendation:** Use WorkOS AuthKit hosted auth with `@workos-inc/authkit-nextjs` and keep default WorkOS emails enabled to satisfy verification and reset requirements with minimal custom code.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| WorkOS AuthKit (hosted) | SaaS | Hosted email/password auth + verification + reset | Official WorkOS flow; handles security-sensitive UX and email lifecycle |
| `@workos-inc/authkit-nextjs` | latest | Next.js App Router SDK for AuthKit | Official SDK for session management and AuthKit integration |
| Next.js App Router | project | Routing + server components | Matches project plan and SDK expectations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| WorkOS Dashboard | SaaS | Redirect URIs, sign-in endpoint, email settings | Required for AuthKit configuration |
| WorkOS Events API / Webhooks | SaaS | Custom email verification/reset flows | Only if default WorkOS emails are disabled |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hosted AuthKit UI | Custom AuthKit UI via Authentication API | More control but requires custom UI + email flows + extra security surface |

**Installation:**
```bash
pnpm i @workos-inc/authkit-nextjs
```

## Architecture Patterns

### Recommended Project Structure
```
apps/web/
├── app/
│   ├── auth/callback/route.ts  # WorkOS AuthKit callback
│   ├── layout.tsx              # AuthKitProvider wrapper
│   └── page.tsx                # Sign-in/sign-up links or protected UI
├── middleware.ts               # Next.js <=15 middleware OR
├── proxy.ts                    # Next.js 16+ proxy
└── .env.local                  # WorkOS env vars
```

### Pattern 1: AuthKit Callback Route
**What:** Handle the OAuth callback and establish the WorkOS session cookie.
**When to use:** Always; required for AuthKit hosted flow.
**Example:**
```ts
// Source: https://raw.githubusercontent.com/workos/authkit-nextjs/main/README.md
import { handleAuth } from '@workos-inc/authkit-nextjs';

export const GET = handleAuth();
```

### Pattern 2: Proxy/Middleware for Session Management
**What:** Protect routes and inject AuthKit session headers for server components.
**When to use:** Always; required for `withAuth()` and route protection.
**Example:**
```ts
// Source: https://raw.githubusercontent.com/workos/authkit-nextjs/main/README.md
import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

export default authkitMiddleware();

export const config = { matcher: ['/', '/admin'] };
```

### Pattern 3: Signed-in vs Signed-out Views
**What:** Use `withAuth()` to show signed-out links or signed-in UI.
**When to use:** Any public page that should adapt based on session state.
**Example:**
```tsx
// Source: https://raw.githubusercontent.com/workos/authkit-nextjs/main/README.md
import Link from 'next/link';
import { getSignInUrl, getSignUpUrl, withAuth, signOut } from '@workos-inc/authkit-nextjs';

export default async function HomePage() {
  const { user } = await withAuth();

  if (!user) {
    const signInUrl = await getSignInUrl();
    const signUpUrl = await getSignUpUrl();
    return (
      <>
        <Link href={signInUrl}>Log in</Link>
        <Link href={signUpUrl}>Sign Up</Link>
      </>
    );
  }

  return (
    <form
      action={async () => {
        'use server';
        await signOut();
      }}
    >
      <button type="submit">Sign out</button>
    </form>
  );
}
```

### Anti-Patterns to Avoid
- **Custom password storage:** Do not implement password hashing or credential storage in app code; use WorkOS hosted auth.
- **Broad middleware matcher:** Avoid catch-all matchers that include static assets; exclude `_next/static`, `_next/image`, and `favicon.ico`.
- **Client `withAuth` usage:** `withAuth()` is server-only; use `useAuth()` in client components.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password auth | Custom hashing + credential store | WorkOS AuthKit hosted Email+Password | Avoid security risk and compliance overhead |
| Email verification | Custom tokens + email delivery | WorkOS default verification emails | Verified flow and deliverability handled by WorkOS |
| Password reset | Custom reset tokens | WorkOS default password reset emails | Avoid token leakage, replay, and link expiration mistakes |
| Session cookies | Custom cookie encryption | `@workos-inc/authkit-nextjs` session handling | Encrypted cookies + refresh handling baked in |

**Key insight:** Auth flows are security-critical; WorkOS AuthKit already implements the hard parts and keeps them current.

## Common Pitfalls

### Pitfall 1: Missing or mismatched redirect URIs
**What goes wrong:** Auth callback fails or loops.
**Why it happens:** Redirect URI in WorkOS dashboard does not match the app callback route.
**How to avoid:** Align the dashboard redirect URI with the `handleAuth` route path and `NEXT_PUBLIC_WORKOS_REDIRECT_URI`.
**Warning signs:** 400/redirect errors after sign-in.

### Pitfall 2: Default emails disabled unintentionally
**What goes wrong:** No verification or reset emails are sent.
**Why it happens:** Default emails disabled in the WorkOS Dashboard without replacing via API.
**How to avoid:** Keep default emails enabled unless a custom email pipeline is implemented.
**Warning signs:** Users never receive verification/reset links.

### Pitfall 3: Middleware matcher breaks static assets
**What goes wrong:** CSS/images fail to load when auth middleware intercepts static files.
**Why it happens:** Catch-all matcher includes `_next/static` and `_next/image`.
**How to avoid:** Use a targeted matcher or explicitly exclude static paths.
**Warning signs:** Broken styling, missing images after enabling middleware.

### Pitfall 4: Cookie password too short
**What goes wrong:** Session encryption fails or the SDK throws errors.
**Why it happens:** `WORKOS_COOKIE_PASSWORD` is under the minimum length.
**How to avoid:** Generate a 32+ character secret as documented.
**Warning signs:** Auth errors during callback or session creation.

## Code Examples

Verified patterns from official sources:

### Callback Handler
```ts
// Source: https://raw.githubusercontent.com/workos/authkit-nextjs/main/README.md
import { handleAuth } from '@workos-inc/authkit-nextjs';

export const GET = handleAuth();
```

### Middleware / Proxy
```ts
// Source: https://raw.githubusercontent.com/workos/authkit-nextjs/main/README.md
import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

export default authkitMiddleware();

export const config = { matcher: ['/', '/admin'] };
```

### Server-Side Auth UI
```tsx
// Source: https://raw.githubusercontent.com/workos/authkit-nextjs/main/README.md
import Link from 'next/link';
import { getSignInUrl, getSignUpUrl, withAuth } from '@workos-inc/authkit-nextjs';

export default async function Page() {
  const { user } = await withAuth();
  if (!user) {
    return (
      <>
        <Link href={await getSignInUrl()}>Log in</Link>
        <Link href={await getSignUpUrl()}>Sign up</Link>
      </>
    );
  }
  return <div>Signed in</div>;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom auth UI + manual sessions | AuthKit hosted UI + `@workos-inc/authkit-nextjs` | Current SDK docs | Faster setup and fewer security pitfalls |
| Next.js `middleware.ts` only | `proxy.ts` in Next.js 16+ | Current SDK docs | Aligns with Next.js proxy naming changes |

**Deprecated/outdated:**
- Relying on custom email verification/reset without WorkOS APIs; default emails cover required flows unless customization is needed.

## Open Questions

1. **Hosted AuthKit UI vs custom UI**
   - What we know: Hosted AuthKit covers email/password, verification, and reset by default.
   - What's unclear: Whether the product needs custom-branded auth UI or email content.
   - Recommendation: Use hosted AuthKit and default emails for Phase 1; revisit customization later.

## Sources

### Primary (HIGH confidence)
- https://workos.com/docs/authkit
- https://workos.com/docs/authkit/email-password
- https://workos.com/docs/authkit/custom-emails
- https://workos.com/docs/sdks/authkit-nextjs
- https://raw.githubusercontent.com/workos/authkit-nextjs/main/README.md

### Secondary (MEDIUM confidence)
- https://workos.com/user-management

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - WorkOS official docs + official SDK README
- Architecture: HIGH - SDK README details callback/middleware/provider patterns
- Pitfalls: MEDIUM - Derived from SDK warnings and typical integration failures

**Research date:** 2026-02-01
**Valid until:** 2026-03-03
