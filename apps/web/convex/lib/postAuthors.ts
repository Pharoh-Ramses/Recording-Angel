type AuthorRecord = {
  userId?: string | null;
  name?: string;
  imageUrl?: string;
};

type DbContext = {
  db: {
    get(id: string): Promise<AuthorRecord | null>;
  };
};

export type ResolvedPostAuthor = {
  kind: "member" | "missionary";
  name: string;
  imageUrl?: string;
};

async function resolveUserAuthor(
  ctx: DbContext,
  source: { userId?: string | null } | null,
  kind: ResolvedPostAuthor["kind"],
): Promise<ResolvedPostAuthor | null> {
  if (!source?.userId) {
    return null;
  }

  const user = await ctx.db.get(source.userId);
  if (!user || typeof user.name !== "string") {
    return null;
  }

  return {
    kind,
    name: user.name,
    imageUrl: user.imageUrl,
  };
}

export async function resolvePostAuthor(
  ctx: DbContext,
  post: {
    authorType: "member" | "missionary";
    authorMemberId?: string;
    authorMissionaryId?: string;
  },
): Promise<ResolvedPostAuthor | null> {
  if (post.authorType === "member") {
    if (!post.authorMemberId) {
      return null;
    }

    const member = await ctx.db.get(post.authorMemberId);
    return await resolveUserAuthor(ctx, member, "member");
  }

  if (!post.authorMissionaryId) {
    return null;
  }

  const missionary = await ctx.db.get(post.authorMissionaryId);
  return await resolveUserAuthor(ctx, missionary, "missionary");
}
