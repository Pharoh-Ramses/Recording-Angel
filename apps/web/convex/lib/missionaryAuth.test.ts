import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { buildMissionaryAccess } from "./missionaryAuth"

describe("buildMissionaryAccess", () => {
  test("grants missionary capabilities to assigned missionaries", () => {
    assert.deepEqual(
      buildMissionaryAccess({
        isWardMissionLeader: false,
        isAssignedMissionary: true,
      }),
      {
      isWardMissionLeader: false,
      isAssignedMissionary: true,
      canManageMissionaries: false,
      canManageCalendars: true,
      canCreateMissionaryAnnouncements: true,
      },
    )
  })

  test("grants management capabilities to ward mission leaders", () => {
    assert.deepEqual(
      buildMissionaryAccess({
        isWardMissionLeader: true,
        isAssignedMissionary: false,
      }),
      {
      isWardMissionLeader: true,
      isAssignedMissionary: false,
      canManageMissionaries: true,
      canManageCalendars: true,
      canCreateMissionaryAnnouncements: false,
      },
    )
  })
})
