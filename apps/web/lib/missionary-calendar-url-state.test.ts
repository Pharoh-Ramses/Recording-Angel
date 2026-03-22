import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  buildMissionaryCalendarQuery,
  parseMissionaryCalendarQuery,
} from "./missionary-calendar-url-state"

describe("missionary calendar URL state", () => {
  test("parseMissionaryCalendarQuery parses month view params", () => {
    const state = parseMissionaryCalendarQuery(
      new URLSearchParams("view=month&month=2026-04"),
    )

    assert.deepEqual(state, {
      month: "2026-04",
      view: "month",
    })
  })

  test("parseMissionaryCalendarQuery falls back for missing query input", () => {
    const state = parseMissionaryCalendarQuery()

    assert.deepEqual(state, {
      month: new Date().toISOString().slice(0, 7),
      view: "month",
    })
  })

  test("parseMissionaryCalendarQuery falls back for invalid query input", () => {
    const state = parseMissionaryCalendarQuery(
      new URLSearchParams("view=week&month=2026-13"),
    )

    assert.deepEqual(state, {
      month: new Date().toISOString().slice(0, 7),
      view: "month",
    })
  })

  test("buildMissionaryCalendarQuery serializes stable query strings", () => {
    const query = buildMissionaryCalendarQuery({
      month: "2026-04",
      view: "month",
    })

    assert.equal(query, "month=2026-04&view=month")
  })
})
