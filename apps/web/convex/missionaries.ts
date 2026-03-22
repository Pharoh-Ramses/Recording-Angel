import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { Id } from "./_generated/dataModel"
import { MutationCtx, QueryCtx } from "./_generated/server"
import {
  getActiveMissionaryAssignment,
  getAuthenticatedMissionary,
  getMissionaryAccessForWard,
  requireWardMissionLeader,
} from "./lib/missionaryAuth"

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

async function requireMissionaryWardAccess(
  ctx: MissionaryCtx,
  wardId: Id<"wards">,
) {
  const access = await getMissionaryAccessForWard(ctx, wardId)
  if (!access.isWardMissionLeader && !access.isAssignedMissionary) {
    throw new Error("Missionary ward access required")
  }
  return access
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
    await requireMissionaryWardAccess(ctx, wardId)

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

    const access = await requireMissionaryWardAccess(ctx, activeAssignment.wardId)

    if (!access.isWardMissionLeader && viewerMissionary?._id !== missionaryId) {
      throw new Error("Missionary ward access required")
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
    await requireWardMissionLeader(ctx, wardId)

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
    phoneNumber: v.optional(v.string()),
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

      await requireWardMissionLeader(ctx, activeAssignment.wardId)
    }

    const patch: {
      name: string
      email: string
      phoneNumber?: string
    } = {
      name,
      email,
    }

    if (phoneNumber !== undefined) {
      patch.phoneNumber = phoneNumber
    }

    await ctx.db.patch(missionaryId, patch)
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

    await requireWardMissionLeader(ctx, currentAssignment.wardId)

    if (currentAssignment.wardId === wardId) {
      throw new Error("Missionary is already assigned to this ward")
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
