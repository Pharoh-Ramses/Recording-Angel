type ActiveMembership<
  MembershipId extends string,
  CompanionshipId extends string,
  MissionaryId extends string,
> = {
  membershipId: MembershipId
  companionshipId: CompanionshipId
  missionaryId: MissionaryId
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
