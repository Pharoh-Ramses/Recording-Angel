import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  buildMissionaryAccess,
  canManageMissionaryCalendarGroup,
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
        canApproveMissionaryAnnouncements: false,
        canPublishMissionaryAnnouncements: false,
      }),
      {
        isWardMissionLeader: false,
        isAssignedMissionary: true,
        canManageMissionaries: false,
        canManageCalendars: true,
        canCreateMissionaryAnnouncements: true,
        canApproveMissionaryAnnouncements: false,
        canPublishMissionaryAnnouncements: false,
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
        canApproveMissionaryAnnouncements: true,
        canPublishMissionaryAnnouncements: false,
      }),
      {
        isWardMissionLeader: true,
        isAssignedMissionary: false,
        canManageMissionaries: true,
        canManageCalendars: true,
        canCreateMissionaryAnnouncements: false,
        canApproveMissionaryAnnouncements: true,
        canPublishMissionaryAnnouncements: false,
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
        canApproveMissionaryAnnouncements: false,
        canPublishMissionaryAnnouncements: false,
      }),
      {
        isWardMissionLeader: false,
        isAssignedMissionary: false,
        canManageMissionaries: false,
        canManageCalendars: false,
        canCreateMissionaryAnnouncements: false,
        canApproveMissionaryAnnouncements: false,
        canPublishMissionaryAnnouncements: false,
      },
    )
  })

  test("allows direct publish only for assigned missionaries with explicit publish capability", () => {
    assert.deepEqual(
      buildMissionaryAccess({
        isAssignedMissionary: true,
        canManageMissionaries: false,
        canManageAssignments: false,
        canManageCalendars: false,
        canApproveMissionaryAnnouncements: false,
        canPublishMissionaryAnnouncements: true,
      }),
      {
        isWardMissionLeader: false,
        isAssignedMissionary: true,
        canManageMissionaries: false,
        canManageCalendars: true,
        canCreateMissionaryAnnouncements: true,
        canApproveMissionaryAnnouncements: false,
        canPublishMissionaryAnnouncements: true,
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

describe("canManageMissionaryCalendarGroup", () => {
  test("allows ward mission leaders to manage any mapped group", () => {
    assert.equal(
      canManageMissionaryCalendarGroup({
        isWardMissionLeader: true,
        hasActiveAssignmentInWard: false,
        belongsToMappedCompanionship: false,
      }),
      true,
    )
  })

  test("allows assigned missionaries to manage their mapped group", () => {
    assert.equal(
      canManageMissionaryCalendarGroup({
        isWardMissionLeader: false,
        hasActiveAssignmentInWard: true,
        belongsToMappedCompanionship: true,
      }),
      true,
    )
  })

  test("rejects missionaries without a current mapped assignment", () => {
    assert.equal(
      canManageMissionaryCalendarGroup({
        isWardMissionLeader: false,
        hasActiveAssignmentInWard: false,
        belongsToMappedCompanionship: true,
      }),
      false,
    )
  })
})
