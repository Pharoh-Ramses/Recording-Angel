type ActiveMembership<
  MembershipId extends string,
  CompanionshipId extends string,
  MissionaryId extends string,
> = {
  membershipId: MembershipId
  companionshipId: CompanionshipId
  missionaryId: MissionaryId
}

export function normalizeMissionaryDinnerSlotDate(date: string) {
  const normalizedDate = date.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    return null
  }

  const parsedDate = new Date(`${normalizedDate}T00:00:00.000Z`)
  if (Number.isNaN(parsedDate.valueOf())) {
    return null
  }

  return parsedDate.toISOString().slice(0, 10) === normalizedDate
    ? normalizedDate
    : null
}

export function planCompanionshipMembershipUpdates<
  MembershipId extends string,
  CompanionshipId extends string,
  MissionaryId extends string,
>({
  companionshipId,
  desiredMissionaryIds,
  activeMemberships,
}: {
  companionshipId: CompanionshipId
  desiredMissionaryIds: MissionaryId[]
  activeMemberships: ActiveMembership<
    MembershipId,
    CompanionshipId,
    MissionaryId
  >[]
}) {
  const desiredMissionaryIdSet = new Set(desiredMissionaryIds)
  const membershipIdsToDeactivate: MembershipId[] = []
  const missionaryIdsToActivate: MissionaryId[] = []
  const alreadyActiveInTarget = new Set<MissionaryId>()

  for (const membership of activeMemberships) {
    const isTargetCompanionship = membership.companionshipId === companionshipId
    const isDesiredMissionary = desiredMissionaryIdSet.has(membership.missionaryId)

    if (isTargetCompanionship && isDesiredMissionary) {
      alreadyActiveInTarget.add(membership.missionaryId)
      continue
    }

    if (isTargetCompanionship || isDesiredMissionary) {
      membershipIdsToDeactivate.push(membership.membershipId)
    }
  }

  for (const missionaryId of desiredMissionaryIds) {
    if (!alreadyActiveInTarget.has(missionaryId)) {
      missionaryIdsToActivate.push(missionaryId)
    }
  }

  return {
    membershipIdsToDeactivate,
    missionaryIdsToActivate,
  }
}
