import { authkitMiddleware } from "@workos-inc/authkit-nextjs";

export default authkitMiddleware();

// Match against pages that require auth context
// Exclude static assets to prevent Tailwind CSS v4 issues
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
