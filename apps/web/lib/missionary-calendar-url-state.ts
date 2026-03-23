export type MissionaryCalendarUrlState = {
  group?: string
  month: string
  view: "month" | "week"
  week: string
}

type SearchParamsLike = {
  get(name: string): string | null
}

function getFallbackMonth() {
  const today = new Date()
  const year = String(today.getFullYear())
  const month = String(today.getMonth() + 1).padStart(2, "0")

  return `${year}-${month}`
}

function getMonthAnchor(month: string) {
  return `${month}-01`
}

function normalizeGroup(group: string | null | undefined) {
  const trimmedGroup = group?.trim()
  return trimmedGroup ? trimmedGroup : undefined
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

function normalizeWeek(week: string | null | undefined) {
  if (!week) {
    return null
  }

  const trimmedWeek = week.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedWeek)) {
    return null
  }

  const parsedDate = new Date(`${trimmedWeek}T00:00:00.000Z`)
  if (Number.isNaN(parsedDate.valueOf())) {
    return null
  }

  return parsedDate.toISOString().slice(0, 10) === trimmedWeek ? trimmedWeek : null
}

function normalizeView(view: string | null | undefined): MissionaryCalendarUrlState["view"] {
  return view === "week" ? "week" : "month"
}

export function parseMissionaryCalendarQuery(
  searchParams?: SearchParamsLike | null,
): MissionaryCalendarUrlState {
  const month = normalizeMonth(searchParams?.get("month")) ?? getFallbackMonth()
  const view = normalizeView(searchParams?.get("view"))

  return {
    group: normalizeGroup(searchParams?.get("group")),
    month,
    view,
    week: normalizeWeek(searchParams?.get("week")) ?? getMonthAnchor(month),
  }
}

export function buildMissionaryCalendarQuery(
  state: Partial<MissionaryCalendarUrlState>,
) {
  const searchParams = new URLSearchParams()
  const month = normalizeMonth(state.month) ?? getFallbackMonth()
  const view = normalizeView(state.view)
  const week = normalizeWeek(state.week) ?? getMonthAnchor(month)
  const group = normalizeGroup(state.group)

  if (group) {
    searchParams.set("group", group)
  }

  searchParams.set("month", month)
  searchParams.set("view", view)

  if (view === "week") {
    searchParams.set("week", week)
  }

  return searchParams.toString()
}
