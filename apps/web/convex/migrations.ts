import { mutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

type LegacyPost = Doc<"posts"> & {
  authorId?: Id<"members">;
};

export const backfillPostAuthors = mutation({
  args: {},
  handler: async (ctx) => {
    const posts = (await ctx.db.query("posts").collect()) as LegacyPost[];

    let migrated = 0;
    let alreadyCompatible = 0;
    let skipped = 0;

    for (const post of posts) {
      if (
        (post.authorType === "member" && post.authorMemberId) ||
        (post.authorType === "missionary" && post.authorMissionaryId)
      ) {
        alreadyCompatible += 1;
        continue;
      }

      const { _id, _creationTime, authorId, ...rest } = post;
      void _creationTime;

      if (authorId) {
        await ctx.db.replace(_id, {
          ...rest,
          authorType: "member",
          authorMemberId: authorId,
        });
        migrated += 1;
        continue;
      }

      if (post.authorMemberId) {
        await ctx.db.replace(_id, {
          ...rest,
          authorType: "member",
          authorMemberId: post.authorMemberId,
        });
        migrated += 1;
        continue;
      }

      if (post.authorMissionaryId) {
        await ctx.db.replace(_id, {
          ...rest,
          authorType: "missionary",
          authorMissionaryId: post.authorMissionaryId,
        });
        migrated += 1;
        continue;
      }

      skipped += 1;
    }

    return {
      total: posts.length,
      migrated,
      alreadyCompatible,
      skipped,
    };
  },
});
