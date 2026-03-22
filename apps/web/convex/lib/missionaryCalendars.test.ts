import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { planCompanionshipMembershipUpdates } from "./missionaryCalendars"

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
