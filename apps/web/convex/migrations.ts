import { mutation } from "./_generated/server";

type LegacyPost = {
  _id: string;
  _creationTime: number;
  authorId?: string;
  authorType?: "member" | "missionary";
  authorMemberId?: string;
  authorMissionaryId?: string;
  [key: string]: unknown;
};

export const backfillPostAuthors = mutation({
  args: {},
  handler: async (ctx) => {
    const posts = (await ctx.db.query("posts").collect()) as unknown as LegacyPost[];

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

      if (authorId) {
        await ctx.db.replace(_id as any, {
          ...rest,
          authorType: "member",
          authorMemberId: authorId as any,
        } as any);
        migrated += 1;
        continue;
      }

      if (post.authorMemberId) {
        await ctx.db.replace(_id as any, {
          ...rest,
          authorType: "member",
          authorMemberId: post.authorMemberId as any,
        } as any);
        migrated += 1;
        continue;
      }

      if (post.authorMissionaryId) {
        await ctx.db.replace(_id as any, {
          ...rest,
          authorType: "missionary",
          authorMissionaryId: post.authorMissionaryId as any,
        } as any);
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
