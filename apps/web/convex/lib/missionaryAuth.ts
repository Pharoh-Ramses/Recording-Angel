import { Id } from "../_generated/dataModel"
import { MutationCtx, QueryCtx } from "../_generated/server"
import { Permission, getAuthenticatedMember, hasPermission } from "./permissions"

type AuthCtx = QueryCtx | MutationCtx

export type MissionaryAccess = {
  isWardMissionLeader: boolean
  isAssignedMissionary: boolean
  canManageMissionaries: boolean
  canManageCalendars: boolean
  canCreateMissionaryAnnouncements: boolean
}

export function buildMissionaryAccess({
  isAssignedMissionary,
  canManageMissionaries,
  canManageAssignments,
  canManageCalendars,
}: {
  isAssignedMissionary: boolean
  canManageMissionaries: boolean
  canManageAssignments: boolean
  canManageCalendars: boolean
}): MissionaryAccess {
  const isWardMissionLeader =
    canManageMissionaries || canManageAssignments || canManageCalendars

  return {
    isWardMissionLeader,
    isAssignedMissionary,
    canManageMissionaries,
    canManageCalendars: canManageCalendars || isAssignedMissionary,
    canCreateMissionaryAnnouncements: isAssignedMissionary,
  }
}

export function getTransferAuthorizationWardIds(
  sourceWardId: string,
  destinationWardId: string,
) {
  return sourceWardId === destinationWardId
    ? [sourceWardId]
    : [sourceWardId, destinationWardId]
}

export async function getAuthenticatedUser(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    return null
  }

  return await ctx.db
    .query("users")
    .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
    .unique()
}

export async function getAuthenticatedMissionary(ctx: AuthCtx) {
  const user = await getAuthenticatedUser(ctx)
  if (!user) {
    return null
  }

  return await ctx.db
    .query("missionaries")
    .withIndex("byUserId", (q) => q.eq("userId", user._id))
    .unique()
}

export async function getActiveMissionaryAssignment(
  ctx: AuthCtx,
  wardId?: Id<"wards">,
) {
  const missionary = await getAuthenticatedMissionary(ctx)
  if (!missionary || missionary.status !== "active") {
    return null
  }

  const activeAssignments = await ctx.db
    .query("missionaryAssignments")
    .withIndex("byMissionaryIdAndStatus", (q) =>
      q.eq("missionaryId", missionary._id).eq("status", "active"),
    )
    .collect()

  if (wardId) {
    return activeAssignments.find((assignment) => assignment.wardId === wardId) ?? null
  }

  if (activeAssignments.length > 1) {
    throw new Error("Missionary has multiple active assignments")
  }

  return activeAssignments[0] ?? null
}

export async function hasWardPermission(
  ctx: AuthCtx,
  wardId: Id<"wards">,
  permission: Permission,
) {
  const member = await getAuthenticatedMember(ctx as QueryCtx, wardId)
  if (!member) {
    return false
  }

  return await hasPermission(ctx as QueryCtx, member._id, permission)
}

export async function isWardMissionLeader(ctx: AuthCtx, wardId: Id<"wards">) {
  const permissions = await Promise.all([
    hasWardPermission(ctx, wardId, "missionary:manage"),
    hasWardPermission(ctx, wardId, "missionary_assignment:manage"),
    hasWardPermission(ctx, wardId, "missionary_calendar:manage"),
  ])

  return permissions.some(Boolean)
}

export async function requireWardPermission(
  ctx: AuthCtx,
  wardId: Id<"wards">,
  permission: Permission,
) {
  const allowed = await hasWardPermission(ctx, wardId, permission)
  if (!allowed) {
    throw new Error(`Missing permission: ${permission}`)
  }
}

export async function requireWardMissionLeader(
  ctx: AuthCtx,
  wardId: Id<"wards">,
) {
  const allowed = await isWardMissionLeader(ctx, wardId)
  if (!allowed) {
    throw new Error("Ward mission leader access required")
  }
}

export async function getMissionaryAccessForWard(
  ctx: AuthCtx,
  wardId: Id<"wards">,
) {
  const [assignment, canManageMissionaries, canManageAssignments, canManageCalendars] = await Promise.all([
    getActiveMissionaryAssignment(ctx, wardId),
    hasWardPermission(ctx, wardId, "missionary:manage"),
    hasWardPermission(ctx, wardId, "missionary_assignment:manage"),
    hasWardPermission(ctx, wardId, "missionary_calendar:manage"),
  ])

  return buildMissionaryAccess({
    isAssignedMissionary: !!assignment,
    canManageMissionaries,
    canManageAssignments,
    canManageCalendars,
  })
}
