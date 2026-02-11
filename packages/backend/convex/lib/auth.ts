import {
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { mutation, query, QueryCtx, MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { Doc } from "../_generated/dataModel";

/**
 * Get the current user from the database by their WorkOS identity token.
 * Returns null if not authenticated or user document doesn't exist yet.
 */
export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();
}

/**
 * Authenticated mutation — requires a logged-in user with a user document.
 * Injects `ctx.user` for the handler.
 */
export const userMutation = customMutation(mutation, {
  args: {},
  input: async (ctx, _args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthenticated: Please sign in to continue");
    }
    return { ctx: { user }, args: {} };
  },
});

/**
 * Authenticated query — requires a logged-in user with a user document.
 * Injects `ctx.user` for the handler.
 */
export const userQuery = customQuery(query, {
  args: {},
  input: async (ctx, _args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthenticated: Please sign in to continue");
    }
    return { ctx: { user }, args: {} };
  },
});

/**
 * Stake leader mutation — requires the caller to be a leader of the given stake.
 * Consumes `stakeId` from args and injects `ctx.user` and `ctx.stakeId`.
 */
export const stakeLeaderMutation = customMutation(mutation, {
  args: { stakeId: v.id("stakes") },
  input: async (ctx, { stakeId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthenticated: Please sign in to continue");
    }

    // Verify the caller is a leader of this stake
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) =>
        q.eq("orgType", "stake").eq("orgId", stakeId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), user._id),
          q.eq(q.field("role"), "leader"),
        ),
      )
      .unique();

    if (!membership) {
      throw new Error(
        "Forbidden: You must be a stake leader to perform this action",
      );
    }

    return { ctx: { user, stakeId }, args: {} };
  },
});
