import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  buildMissionaryAccess,
  canManageMissionaryCalendarGroup,
  getTransferDestinationWardIds,
  getTransferAuthorizationWardIds,
} from "./missionaryAuth"

describe("buildMissionaryAccess", () => {
  test("grants missionary capabilities to assigned missionaries", () => {
    assert.deepEqual(
      buildMissionaryAccess({
        isAssignedMissionary: true,
        canViewMissionaries: false,
        canManageMissionaries: false,
        canManageAssignments: false,
        canManageCompanionships: false,
        canManageCalendars: false,
        canApproveMissionaryAnnouncements: false,
      }),
      {
        canAccessMissionaryAdmin: false,
        isWardMissionLeader: false,
        isAssignedMissionary: true,
        canViewMissionaries: false,
        canManageMissionaries: false,
        canManageAssignments: false,
        canManageCompanionships: false,
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
        canViewMissionaries: true,
        canManageMissionaries: true,
        canManageAssignments: true,
        canManageCompanionships: true,
        canManageCalendars: true,
        canApproveMissionaryAnnouncements: true,
      }),
      {
        canAccessMissionaryAdmin: true,
        isWardMissionLeader: true,
        isAssignedMissionary: false,
        canViewMissionaries: true,
        canManageMissionaries: true,
        canManageAssignments: true,
        canManageCompanionships: true,
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
        canViewMissionaries: false,
        canManageMissionaries: false,
        canManageAssignments: false,
        canManageCompanionships: false,
        canManageCalendars: false,
        canApproveMissionaryAnnouncements: false,
      }),
      {
        canAccessMissionaryAdmin: false,
        isWardMissionLeader: false,
        isAssignedMissionary: false,
        canViewMissionaries: false,
        canManageMissionaries: false,
        canManageAssignments: false,
        canManageCompanionships: false,
        canManageCalendars: false,
        canCreateMissionaryAnnouncements: false,
        canApproveMissionaryAnnouncements: false,
        canPublishMissionaryAnnouncements: false,
      },
    )
  })

  test("keeps direct publish disabled by default for assigned missionaries", () => {
    assert.deepEqual(
      buildMissionaryAccess({
        isAssignedMissionary: true,
        canViewMissionaries: false,
        canManageMissionaries: false,
        canManageAssignments: false,
        canManageCompanionships: false,
        canManageCalendars: false,
        canApproveMissionaryAnnouncements: false,
      }),
      {
        canAccessMissionaryAdmin: false,
        isWardMissionLeader: false,
        isAssignedMissionary: true,
        canViewMissionaries: false,
        canManageMissionaries: false,
        canManageAssignments: false,
        canManageCompanionships: false,
        canManageCalendars: true,
        canCreateMissionaryAnnouncements: true,
        canApproveMissionaryAnnouncements: false,
        canPublishMissionaryAnnouncements: false,
      },
    )
  })

  test("does not expose the admin page to announcement-only reviewers", () => {
    assert.deepEqual(
      buildMissionaryAccess({
        isAssignedMissionary: false,
        canViewMissionaries: false,
        canManageMissionaries: false,
        canManageAssignments: false,
        canManageCompanionships: false,
        canManageCalendars: false,
        canApproveMissionaryAnnouncements: true,
      }),
      {
        canAccessMissionaryAdmin: false,
        isWardMissionLeader: false,
        isAssignedMissionary: false,
        canViewMissionaries: false,
        canManageMissionaries: false,
        canManageAssignments: false,
        canManageCompanionships: false,
        canManageCalendars: false,
        canCreateMissionaryAnnouncements: false,
        canApproveMissionaryAnnouncements: true,
        canPublishMissionaryAnnouncements: false,
      },
    )
  })

  test("treats companionship managers as ward mission leaders", () => {
    assert.deepEqual(
      buildMissionaryAccess({
        isAssignedMissionary: false,
        canViewMissionaries: false,
        canManageMissionaries: false,
        canManageAssignments: false,
        canManageCompanionships: true,
        canManageCalendars: false,
        canApproveMissionaryAnnouncements: false,
      }),
      {
        canAccessMissionaryAdmin: true,
        isWardMissionLeader: true,
        isAssignedMissionary: false,
        canViewMissionaries: false,
        canManageMissionaries: false,
        canManageAssignments: false,
        canManageCompanionships: true,
        canManageCalendars: false,
        canCreateMissionaryAnnouncements: false,
        canApproveMissionaryAnnouncements: false,
        canPublishMissionaryAnnouncements: false,
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

  test("returns only destination wards the caller can manage", () => {
    assert.deepEqual(
      getTransferDestinationWardIds({
        sourceWardId: "ward-a",
        sameStakeWardIds: ["ward-a", "ward-b", "ward-c"],
        manageableWardIds: ["ward-a", "ward-c"],
      }),
      ["ward-c"],
    )
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
