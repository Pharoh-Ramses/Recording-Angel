import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  buildMissionaryAccess,
  getTransferAuthorizationWardIds,
} from "./missionaryAuth"

describe("buildMissionaryAccess", () => {
  test("grants missionary capabilities to assigned missionaries", () => {
    assert.deepEqual(
      buildMissionaryAccess({
        isAssignedMissionary: true,
        canManageMissionaries: false,
        canManageAssignments: false,
        canManageCalendars: false,
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
        isAssignedMissionary: false,
        canManageMissionaries: true,
        canManageAssignments: true,
        canManageCalendars: true,
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

  test("does not treat view-only access as ward mission leader management", () => {
    assert.deepEqual(
      buildMissionaryAccess({
        isAssignedMissionary: false,
        canManageMissionaries: false,
        canManageAssignments: false,
        canManageCalendars: false,
      }),
      {
        isWardMissionLeader: false,
        isAssignedMissionary: false,
        canManageMissionaries: false,
        canManageCalendars: false,
        canCreateMissionaryAnnouncements: false,
      },
    )
  })
})

describe("getTransferAuthorizationWardIds", () => {
  test("requires both source and destination wards when they differ", () => {
    assert.deepEqual(
      getTransferAuthorizationWardIds("source", "destination"),
      ["source", "destination"],
    )
  })

  test("deduplicates transfer authorization when wards match", () => {
    assert.deepEqual(getTransferAuthorizationWardIds("same", "same"), ["same"])
  })
})
