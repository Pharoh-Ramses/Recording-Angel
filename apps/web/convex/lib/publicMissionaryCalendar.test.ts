import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  getPublicDinnerClaimError,
  normalizePublicMissionaryCalendarToken,
  toPublicMissionaryCalendarSummary,
} from "./publicMissionaryCalendar"

describe("publicMissionaryCalendar", () => {
  test("normalizePublicMissionaryCalendarToken trims and rejects blank tokens", () => {
    assert.equal(normalizePublicMissionaryCalendarToken(" share-token "), "share-token")
    assert.equal(normalizePublicMissionaryCalendarToken("   "), null)
  })

  test("toPublicMissionaryCalendarSummary omits internal ids", () => {
    assert.deepEqual(
      toPublicMissionaryCalendarSummary({
        _id: "calendar-group-id",
        name: "North Missionaries",
      }),
      {
        name: "North Missionaries",
      },
    )
  })

  test("getPublicDinnerClaimError allows the first open claim", () => {
    assert.equal(
      getPublicDinnerClaimError({
        hasExistingReservation: false,
        publicCalendarGroupId: "calendar-group-id",
        slotCalendarGroupId: "calendar-group-id",
        slotStatus: "open",
      }),
      null,
    )
  })

  test("getPublicDinnerClaimError rejects duplicate claims", () => {
    assert.equal(
      getPublicDinnerClaimError({
        hasExistingReservation: true,
        publicCalendarGroupId: "calendar-group-id",
        slotCalendarGroupId: "calendar-group-id",
        slotStatus: "open",
      }),
      "Dinner slot already claimed",
    )
  })
})
