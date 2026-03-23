import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  normalizeMissionaryDinnerSlotDate,
  planCompanionshipMembershipUpdates,
} from "./missionaryCalendars"

describe("planCompanionshipMembershipUpdates", () => {
  test("deactivates a missionary's other active companionship before reassigning", () => {
    assert.deepEqual(
      planCompanionshipMembershipUpdates({
        companionshipId: "companionship-b",
        desiredMissionaryIds: ["missionary-1", "missionary-2"],
        activeMemberships: [
          {
            membershipId: "membership-1",
            companionshipId: "companionship-a",
            missionaryId: "missionary-1",
          },
          {
            membershipId: "membership-2",
            companionshipId: "companionship-b",
            missionaryId: "missionary-3",
          },
          {
            membershipId: "membership-3",
            companionshipId: "companionship-b",
            missionaryId: "missionary-2",
          },
        ],
      }),
      {
        membershipIdsToDeactivate: ["membership-1", "membership-2"],
        missionaryIdsToActivate: ["missionary-1"],
      },
    )
  })
})

describe("normalizeMissionaryDinnerSlotDate", () => {
  test("trims and accepts normalized calendar dates", () => {
    assert.equal(normalizeMissionaryDinnerSlotDate(" 2026-03-22 "), "2026-03-22")
  })

  test("rejects malformed calendar dates", () => {
    assert.equal(normalizeMissionaryDinnerSlotDate("03/22/2026"), null)
    assert.equal(normalizeMissionaryDinnerSlotDate("2026-3-22"), null)
    assert.equal(normalizeMissionaryDinnerSlotDate(""), null)
  })

  test("rejects impossible calendar dates", () => {
    assert.equal(normalizeMissionaryDinnerSlotDate("2026-02-30"), null)
    assert.equal(normalizeMissionaryDinnerSlotDate("2026-13-01"), null)
  })
})
