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
  canAccessMissionaryAdmin?: boolean
  isAssignedMissionary: boolean
  isWardMissionLeader: boolean
} | null) {
  return !!access && (
    access.canAccessMissionaryAdmin ||
    access.isAssignedMissionary ||
    access.isWardMissionLeader
  )
}

export function shouldShowFilteredFeedEmptyState({
  filteredResultsCount,
  hasAnyResults,
  status,
  typeFilter,
}: {
  filteredResultsCount: number
  hasAnyResults: boolean
  status: "CanLoadMore" | "Exhausted" | "LoadingFirstPage" | "LoadingMore"
  typeFilter?: string
}) {
  if (filteredResultsCount > 0) {
    return false
  }

  if (status === "CanLoadMore" || status === "LoadingMore") {
    return false
  }

  if (!hasAnyResults) {
    return true
  }

  return !!typeFilter
}
