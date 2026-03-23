import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  canAccessMissionaryHub,
  getPostTypeBadgeLabel,
  getWardFeedEntryPoint,
  shouldShowFilteredFeedEmptyState,
} from "./missionary-integration"

describe("getPostTypeBadgeLabel", () => {
  test("maps missionary announcements to a human-friendly badge label", () => {
    assert.equal(getPostTypeBadgeLabel("missionary_announcement"), "Missionary")
  })

  test("keeps existing feed post labels stable", () => {
    assert.equal(getPostTypeBadgeLabel("event"), "event")
    assert.equal(getPostTypeBadgeLabel("classifieds"), "classifieds")
  })
})

describe("getWardFeedEntryPoint", () => {
  test("keeps members on the normal post composer flow", () => {
    assert.equal(
      getWardFeedEntryPoint({
        isAssignedMissionary: true,
        isMember: true,
      }),
      "member",
    )
  })

  test("routes assigned missionaries without membership to the missionary CTA", () => {
    assert.equal(
      getWardFeedEntryPoint({
        isAssignedMissionary: true,
        isMember: false,
      }),
      "missionary",
    )
  })

  test("keeps visitors on the join flow", () => {
    assert.equal(
      getWardFeedEntryPoint({
        isAssignedMissionary: false,
        isMember: false,
      }),
      "visitor",
    )
  })
})

describe("canAccessMissionaryHub", () => {
  test("allows ward mission leaders into the missionaries navigation", () => {
    assert.equal(
      canAccessMissionaryHub({
        isAssignedMissionary: false,
        isWardMissionLeader: true,
      }),
      true,
    )
  })

  test("allows assigned missionaries into the missionaries navigation", () => {
    assert.equal(
      canAccessMissionaryHub({
        isAssignedMissionary: true,
        isWardMissionLeader: false,
      }),
      true,
    )
  })

  test("hides missionaries navigation for unrelated visitors", () => {
    assert.equal(
      canAccessMissionaryHub({
        isAssignedMissionary: false,
        isWardMissionLeader: false,
      }),
      false,
    )
  })

  test("matches missionary page access for read-only admin access", () => {
    assert.equal(
      canAccessMissionaryHub({
        canAccessMissionaryAdmin: true,
        isAssignedMissionary: false,
        isWardMissionLeader: false,
      } as never),
      true,
    )
  })
})

describe("shouldShowFilteredFeedEmptyState", () => {
  test("keeps the empty state hidden while more pages can still be loaded", () => {
    assert.equal(
      shouldShowFilteredFeedEmptyState({
        filteredResultsCount: 0,
        hasAnyResults: true,
        status: "CanLoadMore",
        typeFilter: "missionary_announcement",
      }),
      false,
    )
  })

  test("shows the empty state once filtering is exhausted", () => {
    assert.equal(
      shouldShowFilteredFeedEmptyState({
        filteredResultsCount: 0,
        hasAnyResults: true,
        status: "Exhausted",
        typeFilter: "missionary_announcement",
      }),
      true,
    )
  })
})
