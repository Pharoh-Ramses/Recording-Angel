import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";

/**
 * Store or update the current user in the database.
 * Called automatically when users authenticate via WorkOS.
 */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called store without authentication present");
    }

    // Check if user already exists by token identifier
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (user !== null) {
      // Update existing user if name or email changed
      const name = identity.name ?? identity.email ?? "User";
      if (user.name !== name || user.email !== identity.email) {
        await ctx.db.patch(user._id, {
          name,
          email: identity.email ?? user.email,
        });
      }
      return user._id;
    }

    // Create new user
    return await ctx.db.insert("users", {
      name: identity.name ?? identity.email ?? "User",
      email: identity.email ?? "",
      tokenIdentifier: identity.tokenIdentifier,
    });
  },
});

/**
 * Get the current authenticated user document.
 * Returns null if not authenticated or user doesn't exist yet.
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});
