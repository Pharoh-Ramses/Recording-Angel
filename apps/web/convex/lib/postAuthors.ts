type DbContext = {
  db: {
    get(id: string): Promise<any>;
  };
};

export type ResolvedPostAuthor = {
  type: "member" | "missionary";
  name: string;
  email: string;
  imageUrl?: string;
};

export async function resolvePostAuthor(
  ctx: DbContext,
  post: {
    authorType: "member" | "missionary";
    authorMemberId?: string;
    authorMissionaryId?: string;
  }
): Promise<ResolvedPostAuthor | null> {
  if (post.authorType === "member") {
    if (!post.authorMemberId) {
      return null;
    }

    const member = await ctx.db.get(post.authorMemberId);
    if (!member) {
      return null;
    }

    const user = await ctx.db.get(member.userId);
    if (!user) {
      return null;
    }

    return {
      type: "member",
      name: user.name,
      email: user.email,
      imageUrl: user.imageUrl,
    };
  }

  if (!post.authorMissionaryId) {
    return null;
  }

  const missionary = await ctx.db.get(post.authorMissionaryId);
  if (!missionary) {
    return null;
  }

  return {
    type: "missionary",
    name: missionary.name,
    email: missionary.email,
  };
}
