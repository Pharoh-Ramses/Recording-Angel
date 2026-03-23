export type PublicMissionaryCalendarSummary = {
  name: string
}

export type PublicDinnerSlotStatus = "open" | "reserved" | "cancelled"

export function normalizePublicMissionaryCalendarToken(token: string) {
  const normalizedToken = token.trim()
  return normalizedToken || null
}

export function toPublicMissionaryCalendarSummary<T extends { name: string }>(
  calendarGroup: T,
) {
  return {
    name: calendarGroup.name,
  }
}

export function getPublicDinnerClaimError({
  hasExistingReservation,
  publicCalendarGroupId,
  slotCalendarGroupId,
  slotStatus,
}: {
  hasExistingReservation: boolean
  publicCalendarGroupId: string
  slotCalendarGroupId: string
  slotStatus: PublicDinnerSlotStatus
}) {
  if (slotCalendarGroupId !== publicCalendarGroupId) {
    return "Dinner slot does not belong to public calendar"
  }

  if (slotStatus !== "open" || hasExistingReservation) {
    return "Dinner slot already claimed"
  }

  return null
}
