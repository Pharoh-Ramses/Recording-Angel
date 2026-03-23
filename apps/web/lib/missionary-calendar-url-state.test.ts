import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  buildMissionaryCalendarQuery,
  parseMissionaryCalendarQuery,
} from "./missionary-calendar-url-state"

describe("missionary calendar URL state", () => {
  test("parseMissionaryCalendarQuery parses month view params", () => {
    const state = parseMissionaryCalendarQuery(
      new URLSearchParams("view=month&month=2026-04&group=group-1"),
    )

    assert.deepEqual(state, {
      group: "group-1",
      month: "2026-04",
      view: "month",
      week: "2026-04-01",
    })
  })

  test("parseMissionaryCalendarQuery parses week view params", () => {
    const state = parseMissionaryCalendarQuery(
      new URLSearchParams("view=week&month=2026-04&week=2026-04-06&group=share-token"),
    )

    assert.deepEqual(state, {
      group: "share-token",
      month: "2026-04",
      view: "week",
      week: "2026-04-06",
    })
  })

  test("parseMissionaryCalendarQuery falls back for missing query input", () => {
    const OriginalDate = globalThis.Date

    class MockDate extends OriginalDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        super(args.length > 0 ? args[0] : "2026-04-01T06:30:00.000Z")
      }

      override getFullYear() {
        return 2026
      }

      override getMonth() {
        return 2
      }

      override toISOString() {
        return "2026-04-01T06:30:00.000Z"
      }

      static override now() {
        return new OriginalDate("2026-04-01T06:30:00.000Z").valueOf()
      }
    }

    globalThis.Date = MockDate as DateConstructor

    try {
      const state = parseMissionaryCalendarQuery()

      assert.deepEqual(state, {
        group: undefined,
        month: "2026-03",
        view: "month",
        week: "2026-03-01",
      })
    } finally {
      globalThis.Date = OriginalDate
    }
  })

  test("parseMissionaryCalendarQuery falls back for invalid query input", () => {
    const state = parseMissionaryCalendarQuery(
      new URLSearchParams("view=week&month=2026-13"),
    )

    assert.deepEqual(state, {
      group: undefined,
      month: new Date().toISOString().slice(0, 7),
      view: "week",
      week: `${new Date().toISOString().slice(0, 7)}-01`,
    })
  })

  test("parseMissionaryCalendarQuery falls back to month anchor for invalid week", () => {
    const state = parseMissionaryCalendarQuery(
      new URLSearchParams("view=week&month=2026-04&week=2026-04-44"),
    )

    assert.deepEqual(state, {
      group: undefined,
      month: "2026-04",
      view: "week",
      week: "2026-04-01",
    })
  })

  test("parseMissionaryCalendarQuery ignores blank group values", () => {
    const state = parseMissionaryCalendarQuery(
      new URLSearchParams("view=month&month=2026-04&group=   "),
    )

    assert.deepEqual(state, {
      group: undefined,
      month: "2026-04",
      view: "month",
      week: "2026-04-01",
    })
  })

  test("buildMissionaryCalendarQuery serializes stable query strings", () => {
    const query = buildMissionaryCalendarQuery({
      group: "group-1",
      month: "2026-04",
      view: "month",
    })

    assert.equal(query, "group=group-1&month=2026-04&view=month")
  })

  test("buildMissionaryCalendarQuery serializes week anchors", () => {
    const query = buildMissionaryCalendarQuery({
      group: "share-token",
      month: "2026-04",
      view: "week",
      week: "2026-04-06",
    })

    assert.equal(query, "group=share-token&month=2026-04&view=week&week=2026-04-06")
  })
})
