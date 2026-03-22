import { v } from "convex/values"

import { Id } from "./_generated/dataModel"
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server"
import { planCompanionshipMembershipUpdates } from "./lib/missionaryCalendars"
import {
  canManageMissionaryCalendarGroup,
  getActiveMissionaryAssignment,
  requireWardMissionLeader,
} from "./lib/missionaryAuth"

function uniqueIds<T extends string>(ids: T[]) {
  return [...new Set(ids)]
}

type CalendarCtx = QueryCtx | MutationCtx

async function getCompanionshipOrThrow(
  ctx: CalendarCtx,
  companionshipId: Id<"companionships">,
) {
  const companionship = await ctx.db.get(companionshipId)
  if (!companionship) {
    throw new Error("Companionship not found")
  }

  return companionship
}

async function getCalendarGroupOrThrow(
  ctx: CalendarCtx,
  calendarGroupId: Id<"missionaryCalendarGroups">,
) {
  const calendarGroup = await ctx.db.get(calendarGroupId)
  if (!calendarGroup) {
    throw new Error("Calendar group not found")
  }

  return calendarGroup
}

async function getPublicCalendarGroupByToken(
  ctx: CalendarCtx,
  token: string,
) {
  const normalizedToken = token.trim()
  if (!normalizedToken) {
    return null
  }

  const calendarGroup = await ctx.db
    .query("missionaryCalendarGroups")
    .withIndex("byShareToken", (q) => q.eq("shareToken", normalizedToken))
    .unique()

  if (!calendarGroup || calendarGroup.status !== "active") {
    return null
  }

  return calendarGroup
}

async function requirePublicCalendarGroupByToken(
  ctx: CalendarCtx,
  token: string,
) {
  const calendarGroup = await getPublicCalendarGroupByToken(ctx, token)
  if (!calendarGroup) {
    throw new Error("Public calendar not found")
  }

  return calendarGroup
}

async function getSlotOrThrow(
  ctx: CalendarCtx,
  slotId: Id<"missionaryDinnerSlots">,
) {
  const slot = await ctx.db.get(slotId)
  if (!slot) {
    throw new Error("Dinner slot not found")
  }

  return slot
}

async function listActiveCompanionshipMissionaryIds(
  ctx: CalendarCtx,
  companionshipId: Id<"companionships">,
) {
  const memberships = await ctx.db
    .query("companionshipMissionaries")
    .withIndex("byCompanionshipId", (q) => q.eq("companionshipId", companionshipId))
    .collect()

  return memberships
    .filter((membership) => membership.status === "active")
    .map((membership) => membership.missionaryId)
}

async function getMappedCompanionshipIdsForGroup(
  ctx: CalendarCtx,
  calendarGroupId: Id<"missionaryCalendarGroups">,
) {
  const mappings = await ctx.db
    .query("missionaryCalendarGroupCompanionships")
    .withIndex("byCalendarGroupId", (q) =>
      q.eq("calendarGroupId", calendarGroupId),
    )
    .collect()

  return mappings.map((mapping) => mapping.companionshipId)
}

async function requireCalendarGroupWriteAccess(
  ctx: CalendarCtx,
  calendarGroupId: Id<"missionaryCalendarGroups">,
) {
  const calendarGroup = await getCalendarGroupOrThrow(ctx, calendarGroupId)
  const [assignment, companionshipIds] = await Promise.all([
    getActiveMissionaryAssignment(ctx, calendarGroup.wardId),
    getMappedCompanionshipIdsForGroup(ctx, calendarGroupId),
  ])

  if (!assignment) {
    await requireWardMissionLeader(ctx, calendarGroup.wardId)
    return calendarGroup
  }

  const companionshipMissionaryMemberships = await Promise.all(
    companionshipIds.map(async (companionshipId) => {
      const missionaryIds = await listActiveCompanionshipMissionaryIds(
        ctx,
        companionshipId,
      )

      return missionaryIds.includes(assignment.missionaryId)
    }),
  )

  const hasWriteAccess = canManageMissionaryCalendarGroup({
    isWardMissionLeader: false,
    hasActiveAssignmentInWard: true,
    belongsToMappedCompanionship: companionshipMissionaryMemberships.some(Boolean),
  })

  if (!hasWriteAccess) {
    await requireWardMissionLeader(ctx, calendarGroup.wardId)
  }

  return calendarGroup
}

export const listCompanionshipsForWard = query({
  args: { wardId: v.id("wards") },
  handler: async (ctx, { wardId }) => {
    await requireWardMissionLeader(ctx, wardId)

    const companionships = await ctx.db
      .query("companionships")
      .withIndex("byWardId", (q) => q.eq("wardId", wardId))
      .collect()

    const companionshipsWithMissionaries = await Promise.all(
      companionships.map(async (companionship) => ({
        ...companionship,
        missionaryIds: await listActiveCompanionshipMissionaryIds(
          ctx,
          companionship._id,
        ),
      })),
    )

    return companionshipsWithMissionaries.sort((a, b) =>
      a.name.localeCompare(b.name),
    )
  },
})

export const saveCompanionship = mutation({
  args: {
    wardId: v.id("wards"),
    companionshipId: v.optional(v.id("companionships")),
    name: v.string(),
    phoneNumber: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, { wardId, companionshipId, name, phoneNumber, status }) => {
    await requireWardMissionLeader(ctx, wardId)

    const ward = await ctx.db.get(wardId)
    if (!ward) {
      throw new Error("Ward not found")
    }

    const normalizedPhoneNumber = phoneNumber?.trim() || undefined
    const normalizedName = name.trim()
    if (!normalizedName) {
      throw new Error("Companionship name is required")
    }

    if (companionshipId) {
      const companionship = await getCompanionshipOrThrow(ctx, companionshipId)
      if (companionship.wardId !== wardId) {
        throw new Error("Companionship does not belong to ward")
      }

      await ctx.db.patch(companionshipId, {
        name: normalizedName,
        phoneNumber: normalizedPhoneNumber,
        status,
      })

      return companionshipId
    }

    return await ctx.db.insert("companionships", {
      wardId,
      name: normalizedName,
      phoneNumber: normalizedPhoneNumber,
      status,
    })
  },
})

export const setCompanionshipMissionaries = mutation({
  args: {
    companionshipId: v.id("companionships"),
    missionaryIds: v.array(v.id("missionaries")),
  },
  handler: async (ctx, { companionshipId, missionaryIds }) => {
    const companionship = await getCompanionshipOrThrow(ctx, companionshipId)
    await requireWardMissionLeader(ctx, companionship.wardId)

    const uniqueMissionaryIds = uniqueIds(missionaryIds)
    const missionaries = await Promise.all(
      uniqueMissionaryIds.map(async (missionaryId) => {
        const [missionary, assignment] = await Promise.all([
          ctx.db.get(missionaryId),
          ctx.db
            .query("missionaryAssignments")
            .withIndex("byMissionaryIdAndStatus", (q) =>
              q.eq("missionaryId", missionaryId).eq("status", "active"),
            )
            .unique(),
        ])

        if (!missionary || missionary.status !== "active") {
          throw new Error("Missionary not found")
        }

        if (!assignment || assignment.wardId !== companionship.wardId) {
          throw new Error("Missionary must have an active assignment in this ward")
        }

        return missionary
      }),
    )

    void missionaries

    const existingMemberships = await ctx.db
      .query("companionshipMissionaries")
      .withIndex("byCompanionshipId", (q) =>
        q.eq("companionshipId", companionshipId),
      )
      .collect()

    const otherActiveMemberships = await Promise.all(
      uniqueMissionaryIds.map(async (missionaryId) => {
        const memberships = await ctx.db
          .query("companionshipMissionaries")
          .withIndex("byMissionaryId", (q) => q.eq("missionaryId", missionaryId))
          .collect()

        return memberships.filter((membership) => membership.status === "active")
      }),
    )

    const activeMembershipsById = new Map(
      [...existingMemberships, ...otherActiveMemberships.flat()]
        .filter((membership) => membership.status === "active")
        .map((membership) => [membership._id, membership]),
    )
    const { membershipIdsToDeactivate, missionaryIdsToActivate } =
      planCompanionshipMembershipUpdates({
        companionshipId,
        desiredMissionaryIds: uniqueMissionaryIds,
        activeMemberships: Array.from(activeMembershipsById.values()).map(
          (membership) => ({
            membershipId: membership._id,
            companionshipId: membership.companionshipId,
            missionaryId: membership.missionaryId,
          }),
        ),
      })
    const now = Date.now()

    for (const membershipId of membershipIdsToDeactivate) {
      const membership = activeMembershipsById.get(membershipId)
      if (membership) {
        await ctx.db.patch(membership._id, {
          endedAt: now,
          status: "inactive",
        })
      }
    }

    for (const missionaryId of missionaryIdsToActivate) {
      await ctx.db.insert("companionshipMissionaries", {
        companionshipId,
        missionaryId,
        startedAt: now,
        status: "active",
      })
    }
  },
})

export const listCalendarGroupsForWard = query({
  args: { wardId: v.id("wards") },
  handler: async (ctx, { wardId }) => {
    await requireWardMissionLeader(ctx, wardId)

    const groups = await ctx.db
      .query("missionaryCalendarGroups")
      .withIndex("byWardId", (q) => q.eq("wardId", wardId))
      .collect()

    const groupsWithCompanionships = await Promise.all(
      groups.map(async (group) => ({
        ...group,
        companionshipIds: await getMappedCompanionshipIdsForGroup(ctx, group._id),
      })),
    )

    return groupsWithCompanionships.sort((a, b) => a.name.localeCompare(b.name))
  },
})

export const saveCalendarGroup = mutation({
  args: {
    wardId: v.id("wards"),
    calendarGroupId: v.optional(v.id("missionaryCalendarGroups")),
    name: v.string(),
    shareToken: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, { wardId, calendarGroupId, name, shareToken, status }) => {
    await requireWardMissionLeader(ctx, wardId)

    const ward = await ctx.db.get(wardId)
    if (!ward) {
      throw new Error("Ward not found")
    }

    const normalizedName = name.trim()
    const normalizedShareToken = shareToken.trim()
    if (!normalizedName) {
      throw new Error("Calendar group name is required")
    }
    if (!normalizedShareToken) {
      throw new Error("Share token is required")
    }

    const existingByToken = await ctx.db
      .query("missionaryCalendarGroups")
      .withIndex("byShareToken", (q) => q.eq("shareToken", normalizedShareToken))
      .unique()

    if (existingByToken && existingByToken._id !== calendarGroupId) {
      throw new Error("Share token already exists")
    }

    if (calendarGroupId) {
      const calendarGroup = await getCalendarGroupOrThrow(ctx, calendarGroupId)
      if (calendarGroup.wardId !== wardId) {
        throw new Error("Calendar group does not belong to ward")
      }

      await ctx.db.patch(calendarGroupId, {
        name: normalizedName,
        shareToken: normalizedShareToken,
        status,
      })

      return calendarGroupId
    }

    return await ctx.db.insert("missionaryCalendarGroups", {
      wardId,
      name: normalizedName,
      shareToken: normalizedShareToken,
      status,
    })
  },
})

export const setCalendarGroupCompanionships = mutation({
  args: {
    calendarGroupId: v.id("missionaryCalendarGroups"),
    companionshipIds: v.array(v.id("companionships")),
  },
  handler: async (ctx, { calendarGroupId, companionshipIds }) => {
    const calendarGroup = await getCalendarGroupOrThrow(ctx, calendarGroupId)
    await requireWardMissionLeader(ctx, calendarGroup.wardId)

    const uniqueCompanionshipIds = uniqueIds(companionshipIds)
    const companionships = await Promise.all(
      uniqueCompanionshipIds.map((companionshipId) =>
        getCompanionshipOrThrow(ctx, companionshipId),
      ),
    )

    for (const companionship of companionships) {
      if (companionship.wardId !== calendarGroup.wardId) {
        throw new Error("Companionship must belong to the same ward")
      }
    }

    const existingMappings = await ctx.db
      .query("missionaryCalendarGroupCompanionships")
      .withIndex("byCalendarGroupId", (q) => q.eq("calendarGroupId", calendarGroupId))
      .collect()

    for (const mapping of existingMappings) {
      await ctx.db.delete(mapping._id)
    }

    for (const companionshipId of uniqueCompanionshipIds) {
      await ctx.db.insert("missionaryCalendarGroupCompanionships", {
        calendarGroupId,
        companionshipId,
      })
    }
  },
})

export const listSlotsForGroup = query({
  args: {
    calendarGroupId: v.id("missionaryCalendarGroups"),
    from: v.string(),
    to: v.string(),
  },
  handler: async (ctx, { calendarGroupId, from, to }) => {
    if (from > to) {
      throw new Error("Invalid slot range")
    }

    await requireCalendarGroupWriteAccess(ctx, calendarGroupId)

    const slots = await ctx.db
      .query("missionaryDinnerSlots")
      .withIndex("byCalendarGroupIdAndDate", (q) =>
        q.eq("calendarGroupId", calendarGroupId).gte("date", from).lte("date", to),
      )
      .collect()

    return slots.sort((a, b) => a.date.localeCompare(b.date))
  },
})

export const getPublicCalendarByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const calendarGroup = await getPublicCalendarGroupByToken(ctx, token)
    if (!calendarGroup) {
      return null
    }

    return {
      _id: calendarGroup._id,
      name: calendarGroup.name,
    }
  },
})

export const listPublicSlots = query({
  args: {
    token: v.string(),
    from: v.string(),
    to: v.string(),
  },
  handler: async (ctx, { token, from, to }) => {
    if (from > to) {
      throw new Error("Invalid slot range")
    }

    const calendarGroup = await getPublicCalendarGroupByToken(ctx, token)
    if (!calendarGroup) {
      return []
    }

    const slots = await ctx.db
      .query("missionaryDinnerSlots")
      .withIndex("byCalendarGroupIdAndDate", (q) =>
        q.eq("calendarGroupId", calendarGroup._id).gte("date", from).lte("date", to),
      )
      .collect()

    return slots.sort((a, b) => a.date.localeCompare(b.date))
  },
})

export const saveDinnerSlot = mutation({
  args: {
    calendarGroupId: v.id("missionaryCalendarGroups"),
    slotId: v.optional(v.id("missionaryDinnerSlots")),
    date: v.string(),
    mealType: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { calendarGroupId, slotId, date, mealType, notes }) => {
    const calendarGroup = await requireCalendarGroupWriteAccess(ctx, calendarGroupId)
    const normalizedDate = date.trim()
    if (!normalizedDate) {
      throw new Error("Slot date is required")
    }

    const patch = {
      date: normalizedDate,
      mealType: mealType?.trim() || undefined,
      notes: notes?.trim() || undefined,
    }

    if (slotId) {
      const slot = await getSlotOrThrow(ctx, slotId)
      if (slot.calendarGroupId !== calendarGroup._id) {
        throw new Error("Dinner slot does not belong to calendar group")
      }

      await ctx.db.patch(slotId, patch)
      return slotId
    }

    return await ctx.db.insert("missionaryDinnerSlots", {
      calendarGroupId,
      ...patch,
      status: "open",
    })
  },
})

export const deleteDinnerSlot = mutation({
  args: { slotId: v.id("missionaryDinnerSlots") },
  handler: async (ctx, { slotId }) => {
    const slot = await getSlotOrThrow(ctx, slotId)
    await requireCalendarGroupWriteAccess(ctx, slot.calendarGroupId)

    const reservations = await ctx.db
      .query("missionaryDinnerReservations")
      .withIndex("bySlotId", (q) => q.eq("slotId", slotId))
      .collect()

    for (const reservation of reservations) {
      await ctx.db.delete(reservation._id)
    }

    await ctx.db.delete(slotId)
  },
})

export const claimPublicDinnerSlot = mutation({
  args: {
    token: v.string(),
    slotId: v.id("missionaryDinnerSlots"),
    volunteerName: v.string(),
    volunteerPhone: v.string(),
  },
  handler: async (ctx, { token, slotId, volunteerName, volunteerPhone }) => {
    const calendarGroup = await requirePublicCalendarGroupByToken(ctx, token)
    const normalizedVolunteerName = volunteerName.trim()
    const normalizedVolunteerPhone = volunteerPhone.trim()

    if (!normalizedVolunteerName) {
      throw new Error("Volunteer name is required")
    }

    if (!normalizedVolunteerPhone) {
      throw new Error("Volunteer phone is required")
    }

    const slot = await getSlotOrThrow(ctx, slotId)
    if (slot.calendarGroupId !== calendarGroup._id) {
      throw new Error("Dinner slot does not belong to public calendar")
    }

    const existingReservation = await ctx.db
      .query("missionaryDinnerReservations")
      .withIndex("bySlotId", (q) => q.eq("slotId", slotId))
      .collect()

    const reservation = existingReservation[0]

    if (slot.status !== "open" || reservation) {
      throw new Error("Dinner slot already claimed")
    }

    await ctx.db.patch(slotId, { status: "reserved" })

    return await ctx.db.insert("missionaryDinnerReservations", {
      slotId,
      volunteerName: normalizedVolunteerName,
      volunteerPhone: normalizedVolunteerPhone,
      claimedAt: Date.now(),
    })
  },
})
