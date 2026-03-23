export type MissionaryCalendarView = "month" | "week"

export type MissionaryCalendarRange = {
  from: string
  to: string
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function toDateParts(value: string) {
  const [year = 1970, month = 1, day = 1] = value.split("-").map(Number)
  return { year, month, day }
}

export function parseCalendarDate(value: string) {
  const { year, month, day } = toDateParts(value)
  return new Date(year, month - 1, day)
}

export function formatCalendarDate(date: Date) {
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function formatCalendarMonth(date: Date) {
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, "0")

  return `${year}-${month}`
}

export function addDays(value: string, amount: number) {
  const date = parseCalendarDate(value)
  date.setDate(date.getDate() + amount)
  return formatCalendarDate(date)
}

export function addMonths(value: string, amount: number) {
  const date = parseCalendarDate(`${value}-01`)
  date.setMonth(date.getMonth() + amount)
  return formatCalendarMonth(date)
}

export function getStartOfWeek(value: string) {
  const date = parseCalendarDate(value)
  date.setDate(date.getDate() - date.getDay())
  return formatCalendarDate(date)
}

export function getEndOfWeek(value: string) {
  return addDays(getStartOfWeek(value), 6)
}

export function getMonthRange(month: string): MissionaryCalendarRange {
  const firstOfMonth = parseCalendarDate(`${month}-01`)
  const lastOfMonth = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() + 1, 0)
  const from = addDays(formatCalendarDate(firstOfMonth), -firstOfMonth.getDay())
  const to = addDays(formatCalendarDate(lastOfMonth), 6 - lastOfMonth.getDay())

  return { from, to }
}

export function getCalendarRange(view: MissionaryCalendarView, month: string, week: string) {
  if (view === "week") {
    return {
      from: getStartOfWeek(week),
      to: getEndOfWeek(week),
    }
  }

  return getMonthRange(month)
}

export function getMonthLabel(month: string) {
  return parseCalendarDate(`${month}-01`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })
}

export function getWeekLabel(week: string) {
  const start = parseCalendarDate(getStartOfWeek(week))
  const end = parseCalendarDate(getEndOfWeek(week))

  return `${start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} - ${end.toLocaleDateString(undefined, {
    month: start.getMonth() === end.getMonth() ? undefined : "short",
    day: "numeric",
    year: start.getFullYear() === end.getFullYear() ? undefined : "numeric",
  })}`
}

export function listDatesInRange(range: MissionaryCalendarRange) {
  const dates: string[] = []
  let current = range.from

  while (current <= range.to) {
    dates.push(current)
    current = addDays(current, 1)
  }

  return dates
}

export function getWeekdayName(value: string) {
  return DAY_NAMES[parseCalendarDate(value).getDay()] ?? ""
}

export function isSameMonth(date: string, month: string) {
  return date.startsWith(`${month}-`)
}
