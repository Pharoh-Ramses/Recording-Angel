export type MissionaryCalendarUrlState = {
  month: string
  view: "month"
}

type SearchParamsLike = {
  get(name: string): string | null
}

function getFallbackMonth() {
  return new Date().toISOString().slice(0, 7)
}

function normalizeMonth(month: string | null | undefined) {
  if (!month) {
    return null
  }

  const trimmedMonth = month.trim()
  if (!/^\d{4}-\d{2}$/.test(trimmedMonth)) {
    return null
  }

  const [, monthPart] = trimmedMonth.split("-")
  const monthNumber = Number(monthPart)
  if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    return null
  }

  return trimmedMonth
}

function normalizeView(view: string | null | undefined): MissionaryCalendarUrlState["view"] {
  return view === "month" ? "month" : "month"
}

export function parseMissionaryCalendarQuery(
  searchParams?: SearchParamsLike | null,
): MissionaryCalendarUrlState {
  return {
    month: normalizeMonth(searchParams?.get("month")) ?? getFallbackMonth(),
    view: normalizeView(searchParams?.get("view")),
  }
}

export function buildMissionaryCalendarQuery(
  state: Partial<MissionaryCalendarUrlState>,
) {
  const searchParams = new URLSearchParams()
  const month = normalizeMonth(state.month) ?? getFallbackMonth()
  const view = normalizeView(state.view)

  searchParams.set("month", month)
  searchParams.set("view", view)

  return searchParams.toString()
}
