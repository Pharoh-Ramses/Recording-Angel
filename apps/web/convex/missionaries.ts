import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import { mutation, query } from "./_generated/server"
import { Id } from "./_generated/dataModel"
import { MutationCtx, QueryCtx } from "./_generated/server"
import {
  getActiveMissionaryAssignment,
  getAuthenticatedMissionary,
  getMissionaryAccessForWard,
  getTransferAuthorizationWardIds,
  hasWardPermission,
  requireWardPermission,
} from "./lib/missionaryAuth"
import { resolvePostAuthor } from "./lib/postAuthors"

type MissionaryCtx = QueryCtx | MutationCtx

async function getMissionaryActiveAssignmentById(
  ctx: MissionaryCtx,
  missionaryId: Id<"missionaries">,
) {
  const activeAssignments = await ctx.db
    .query("missionaryAssignments")
    .withIndex("byMissionaryIdAndStatus", (q) =>
      q.eq("missionaryId", missionaryId).eq("status", "active"),
    )
    .collect()

  if (activeAssignments.length > 1) {
    throw new Error("Missionary has multiple active assignments")
  }

  return activeAssignments[0] ?? null
}

async function requireMissionaryViewPermission(
  ctx: MissionaryCtx,
  wardId: Id<"wards">,
) {
  const allowed = await hasWardPermission(ctx, wardId, "missionary:view")
  if (!allowed) {
    throw new Error("Missing permission: missionary:view")
  }
}

export const myWardAccess = query({
  args: { wardId: v.id("wards") },
  handler: async (ctx, { wardId }) => {
    return await getMissionaryAccessForWard(ctx, wardId)
  },
})

export const myActiveAssignment = query({
  args: { wardId: v.optional(v.id("wards")) },
  handler: async (ctx, { wardId }) => {
    const assignment = await getActiveMissionaryAssignment(ctx, wardId)
    if (!assignment) {
      return null
    }

    const [missionary, ward, stake] = await Promise.all([
      ctx.db.get(assignment.missionaryId),
      ctx.db.get(assignment.wardId),
      ctx.db.get(assignment.stakeId),
    ])

    return {
      ...assignment,
      missionary,
      ward,
      stake,
    }
  },
})

export const listForWard = query({
  args: { wardId: v.id("wards") },
  handler: async (ctx, { wardId }) => {
    await requireMissionaryViewPermission(ctx, wardId)

    const assignments = await ctx.db
      .query("missionaryAssignments")
      .withIndex("byWardId", (q) => q.eq("wardId", wardId))
      .collect()

    const activeAssignments = assignments.filter(
      (assignment) => assignment.status === "active",
    )

    return await Promise.all(
      activeAssignments.map(async (assignment) => {
        const missionary = await ctx.db.get(assignment.missionaryId)
        if (!missionary) {
          return null
        }

        const user = await ctx.db.get(missionary.userId)

        return {
          ...missionary,
          user,
          activeAssignment: assignment,
        }
      }),
    ).then((missionaries) => missionaries.filter((missionary) => missionary !== null))
  },
})

export const getById = query({
  args: { missionaryId: v.id("missionaries") },
  handler: async (ctx, { missionaryId }) => {
    const missionary = await ctx.db.get(missionaryId)
    if (!missionary) {
      return null
    }

    const [viewerMissionary, activeAssignment, user] = await Promise.all([
      getAuthenticatedMissionary(ctx),
      getMissionaryActiveAssignmentById(ctx, missionaryId),
      ctx.db.get(missionary.userId),
    ])

    if (!activeAssignment) {
      if (!viewerMissionary || viewerMissionary._id !== missionaryId) {
        throw new Error("Missionary ward access required")
      }

      return {
        ...missionary,
        user,
        activeAssignment: null,
      }
    }

    const canViewMissionary = await hasWardPermission(
      ctx,
      activeAssignment.wardId,
      "missionary:view",
    )

    if (!canViewMissionary && viewerMissionary?._id !== missionaryId) {
      throw new Error("Missing permission: missionary:view")
    }

    const [ward, stake] = await Promise.all([
      ctx.db.get(activeAssignment.wardId),
      ctx.db.get(activeAssignment.stakeId),
    ])

    return {
      ...missionary,
      user,
      activeAssignment,
      ward,
      stake,
    }
  },
})

export const createMissionary = mutation({
  args: {
    wardId: v.id("wards"),
    userId: v.id("users"),
    name: v.string(),
    email: v.string(),
    phoneNumber: v.optional(v.string()),
  },
  handler: async (ctx, { wardId, userId, name, email, phoneNumber }) => {
    await requireWardPermission(ctx, wardId, "missionary:manage")
    await requireWardPermission(ctx, wardId, "missionary_assignment:manage")

    const [ward, user, existingMissionary] = await Promise.all([
      ctx.db.get(wardId),
      ctx.db.get(userId),
      ctx.db
        .query("missionaries")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .unique(),
    ])

    if (!ward) {
      throw new Error("Ward not found")
    }

    if (!user) {
      throw new Error("User not found")
    }

    if (existingMissionary) {
      throw new Error("Missionary already exists for this user")
    }

    const startedAt = Date.now()
    const missionaryId = await ctx.db.insert("missionaries", {
      userId,
      name,
      email,
      phoneNumber,
      status: "active",
    })

    await ctx.db.insert("missionaryAssignments", {
      missionaryId,
      wardId,
      stakeId: ward.stakeId,
      startedAt,
      status: "active",
    })

    return missionaryId
  },
})

export const updateMissionaryProfile = mutation({
  args: {
    missionaryId: v.id("missionaries"),
    name: v.string(),
    email: v.string(),
    phoneNumber: v.string(),
  },
  handler: async (ctx, { missionaryId, name, email, phoneNumber }) => {
    const missionary = await ctx.db.get(missionaryId)
    if (!missionary) {
      throw new Error("Missionary not found")
    }

    const [viewerMissionary, activeAssignment] = await Promise.all([
      getAuthenticatedMissionary(ctx),
      getMissionaryActiveAssignmentById(ctx, missionaryId),
    ])

    const isSelf = viewerMissionary?._id === missionaryId
    if (!isSelf) {
      if (!activeAssignment) {
        throw new Error("Ward mission leader access required")
      }

      await requireWardPermission(ctx, activeAssignment.wardId, "missionary:manage")
    }

    await ctx.db.patch(missionaryId, {
      name,
      email,
      phoneNumber,
    })
  },
})

export const transferMissionary = mutation({
  args: {
    missionaryId: v.id("missionaries"),
    wardId: v.id("wards"),
  },
  handler: async (ctx, { missionaryId, wardId }) => {
    const missionary = await ctx.db.get(missionaryId)
    if (!missionary) {
      throw new Error("Missionary not found")
    }

    const [newWard, currentAssignment] = await Promise.all([
      ctx.db.get(wardId),
      getMissionaryActiveAssignmentById(ctx, missionaryId),
    ])

    if (!newWard) {
      throw new Error("Ward not found")
    }

    if (!currentAssignment) {
      throw new Error("Missionary has no active assignment")
    }

    if (currentAssignment.wardId === wardId) {
      throw new Error("Missionary is already assigned to this ward")
    }

    const authorizationWardIds = getTransferAuthorizationWardIds(
      currentAssignment.wardId,
      wardId,
    ) as Id<"wards">[]

    for (const authorizationWardId of authorizationWardIds) {
      await requireWardPermission(
        ctx,
        authorizationWardId,
        "missionary_assignment:manage",
      )
    }

    const endedAt = Date.now()
    await ctx.db.patch(currentAssignment._id, {
      endedAt,
      status: "ended",
    })

    return await ctx.db.insert("missionaryAssignments", {
      missionaryId,
      wardId,
      stakeId: newWard.stakeId,
      startedAt: endedAt,
      status: "active",
    })
  },
})

export const createAnnouncement = mutation({
  args: {
    wardId: v.id("wards"),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { wardId, title, content }) => {
    const [missionary, assignment] = await Promise.all([
      getAuthenticatedMissionary(ctx),
      getActiveMissionaryAssignment(ctx, wardId),
    ])

    if (!missionary || !assignment) {
      throw new Error("Assigned missionary access required")
    }

    const canPublishDirectly = await hasWardPermission(
      ctx,
      wardId,
      "missionary_post:publish_directly",
    )

    const postId = await ctx.db.insert("posts", {
      authorType: "missionary",
      authorMissionaryId: missionary._id,
      wardId,
      stakeId: assignment.stakeId,
      scope: "ward",
      type: "missionary_announcement",
      title,
      content,
      status: canPublishDirectly ? "approved" : "pending_review",
    })

    if (canPublishDirectly) {
      await ctx.scheduler.runAfter(0, internal.translations.translatePost, {
        postId,
      })
    }

    return postId
  },
})

export const listPendingAnnouncements = query({
  args: {
    wardId: v.id("wards"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { wardId, paginationOpts }) => {
    await requireWardPermission(ctx, wardId, "missionary_post:approve")

    const results = await ctx.db
      .query("posts")
      .withIndex("byWardIdAndStatus", (q) =>
        q.eq("wardId", wardId).eq("status", "pending_review"),
      )
      .filter((q) => q.eq(q.field("type"), "missionary_announcement"))
      .order("desc")
      .paginate(paginationOpts)

    const page = await Promise.all(
      results.page.map(async (post) => {
        const author = await resolvePostAuthor(ctx, post)
        return { ...post, author }
      }),
    )

    return {
      ...results,
      page,
    }
  },
})

export const approveAnnouncement = mutation({
  args: {
    postId: v.id("posts"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { postId, notes }) => {
    const post = await ctx.db.get(postId)
    if (!post || post.type !== "missionary_announcement") {
      throw new Error("Missionary announcement not found")
    }

    if (post.status !== "pending_review") {
      throw new Error("Missionary announcement is not pending review")
    }

    await requireWardPermission(ctx, post.wardId, "missionary_post:approve")

    await ctx.db.patch(postId, {
      status: "approved",
      moderationNotes: notes ?? "Approved by ward mission leader",
    })

    await ctx.scheduler.runAfter(0, internal.translations.translatePost, {
      postId,
    })
  },
})

export const rejectAnnouncement = mutation({
  args: {
    postId: v.id("posts"),
    notes: v.string(),
  },
  handler: async (ctx, { postId, notes }) => {
    const post = await ctx.db.get(postId)
    if (!post || post.type !== "missionary_announcement") {
      throw new Error("Missionary announcement not found")
    }

    if (post.status !== "pending_review") {
      throw new Error("Missionary announcement is not pending review")
    }

    await requireWardPermission(ctx, post.wardId, "missionary_post:approve")

    await ctx.db.patch(postId, {
      status: "rejected",
      moderationNotes: notes,
    })
  },
})
