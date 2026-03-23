export function getPostTypeBadgeLabel(type: string) {
  if (type === "missionary_announcement") {
    return "Missionary"
  }

  return type
}

export function getWardFeedEntryPoint({
  isAssignedMissionary,
  isMember,
}: {
  isAssignedMissionary: boolean
  isMember: boolean
}) {
  if (isMember) {
    return "member"
  }

  if (isAssignedMissionary) {
    return "missionary"
  }

  return "visitor"
}

export function canAccessMissionaryHub(access?: {
  isAssignedMissionary: boolean
  isWardMissionLeader: boolean
} | null) {
  return !!access && (access.isAssignedMissionary || access.isWardMissionLeader)
}
