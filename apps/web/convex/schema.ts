import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users synced from Clerk via webhook
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    preferredLanguage: v.optional(v.string()),
  }).index("byClerkId", ["clerkId"]),

  // Stakes (top-level org)
  stakes: defineTable({
    name: v.string(),
    slug: v.string(),
    languages: v.array(v.string()),
    settings: v.object({}),
  }).index("bySlug", ["slug"]),

  // Wards within a stake
  wards: defineTable({
    name: v.string(),
    slug: v.string(),
    stakeId: v.id("stakes"),
    settings: v.object({}),
  })
    .index("bySlug", ["slug"])
    .index("byStakeId", ["stakeId"])
    .index("byStakeIdAndSlug", ["stakeId", "slug"]),

  // Ward membership
  members: defineTable({
    userId: v.id("users"),
    wardId: v.id("wards"),
    stakeId: v.id("stakes"),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("inactive")
    ),
  })
    .index("byUserId", ["userId"])
    .index("byWardId", ["wardId"])
    .index("byWardIdAndStatus", ["wardId", "status"])
    .index("byUserIdAndWardId", ["userId", "wardId"]),

  // Roles per ward
  roles: defineTable({
    name: v.string(),
    wardId: v.optional(v.id("wards")),
    stakeId: v.optional(v.id("stakes")),
    permissions: v.array(v.string()),
    isSystem: v.boolean(),
    level: v.union(v.literal("ward"), v.literal("stake")),
  })
    .index("byWardId", ["wardId"])
    .index("byStakeId", ["stakeId"]),

  // Member-role assignments
  memberRoles: defineTable({
    memberId: v.id("members"),
    roleId: v.id("roles"),
  })
    .index("byMemberId", ["memberId"])
    .index("byRoleId", ["roleId"]),

  // Persistent missionary profiles
  missionaries: defineTable({
    userId: v.id("users"),
    name: v.string(),
    email: v.string(),
    phoneNumber: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
  }).index("byUserId", ["userId"]),

  // Time-bound ward assignments for missionaries
  missionaryAssignments: defineTable({
    missionaryId: v.id("missionaries"),
    wardId: v.id("wards"),
    stakeId: v.id("stakes"),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("ended")),
  })
    .index("byMissionaryId", ["missionaryId"])
    .index("byWardId", ["wardId"])
    .index("byMissionaryIdAndStatus", ["missionaryId", "status"]),

  // Ward-scoped companionships for missionary operations
  companionships: defineTable({
    wardId: v.id("wards"),
    name: v.string(),
    phoneNumber: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
  }).index("byWardId", ["wardId"]),

  // Historical missionary membership within companionships
  companionshipMissionaries: defineTable({
    companionshipId: v.id("companionships"),
    missionaryId: v.id("missionaries"),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("inactive")),
  })
    .index("byCompanionshipId", ["companionshipId"])
    .index("byMissionaryId", ["missionaryId"]),

  // Shareable dinner calendar containers
  missionaryCalendarGroups: defineTable({
    wardId: v.id("wards"),
    name: v.string(),
    slug: v.optional(v.string()),
    shareToken: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
  })
    .index("byWardId", ["wardId"])
    .index("byShareToken", ["shareToken"]),

  // Companionship membership within a calendar group
  missionaryCalendarGroupCompanionships: defineTable({
    calendarGroupId: v.id("missionaryCalendarGroups"),
    companionshipId: v.id("companionships"),
  })
    .index("byCalendarGroupId", ["calendarGroupId"])
    .index("byCompanionshipId", ["companionshipId"]),

  // Bookable dinner slots for a calendar group
  missionaryDinnerSlots: defineTable({
    calendarGroupId: v.id("missionaryCalendarGroups"),
    date: v.string(),
    mealType: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal("open"),
      v.literal("reserved"),
      v.literal("cancelled")
    ),
  })
    .index("byCalendarGroupId", ["calendarGroupId"])
    .index("byCalendarGroupIdAndDate", ["calendarGroupId", "date"]),

  // Volunteer reservations for missionary dinner slots
  missionaryDinnerReservations: defineTable({
    slotId: v.id("missionaryDinnerSlots"),
    volunteerName: v.string(),
    volunteerPhone: v.string(),
    claimedAt: v.number(),
    notes: v.optional(v.string()),
  }).index("bySlotId", ["slotId"]),

  // Tokenized share links for calendar groups
  missionaryShareLinks: defineTable({
    calendarGroupId: v.id("missionaryCalendarGroups"),
    token: v.string(),
    status: v.union(v.literal("active"), v.literal("revoked")),
  })
    .index("byToken", ["token"])
    .index("byCalendarGroupId", ["calendarGroupId"]),

  // Posts (core content)
  posts: defineTable({
    authorId: v.optional(v.id("members")),
    authorType: v.optional(
      v.union(v.literal("member"), v.literal("missionary"))
    ),
    authorMemberId: v.optional(v.id("members")),
    authorMissionaryId: v.optional(v.id("missionaries")),
    wardId: v.id("wards"),
    stakeId: v.id("stakes"),
    scope: v.union(v.literal("ward"), v.literal("stake")),
    type: v.union(
      v.literal("announcement"),
      v.literal("event"),
      v.literal("classifieds"),
      v.literal("poll"),
      v.literal("missionary_announcement")
    ),
    title: v.string(),
    content: v.string(), // HTML from Tiptap editor
    status: v.union(
      v.literal("draft"),
      v.literal("pending_review"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    moderationNotes: v.optional(v.string()),
    // Event-specific fields
    eventDate: v.optional(v.string()),
    eventLocation: v.optional(v.string()),
    // Poll-specific fields
    pollCloseDate: v.optional(v.string()),
    isPinned: v.optional(v.boolean()),
  })
    .index("byWardIdAndStatus", ["wardId", "status"])
    .index("byStakeIdAndScopeAndStatus", ["stakeId", "scope", "status"])
    .index("byAuthorMemberId", ["authorMemberId"])
    .index("byAuthorMissionaryId", ["authorMissionaryId"]),

  // AI moderation settings per ward/stake
  moderationSettings: defineTable({
    wardId: v.optional(v.id("wards")),
    stakeId: v.optional(v.id("stakes")),
    level: v.union(v.literal("ward"), v.literal("stake")),
    aiPrompt: v.string(),
    autoApproveTypes: v.array(v.string()),
  })
    .index("byWardId", ["wardId"])
    .index("byStakeId", ["stakeId"]),

  // Translated versions of posts
  postTranslations: defineTable({
    postId: v.id("posts"),
    language: v.string(),
    title: v.string(),
    content: v.string(),
    eventLocation: v.optional(v.string()),
    pollOptionLabels: v.optional(v.array(v.string())),
  })
    .index("byPostId", ["postId"])
    .index("byPostIdAndLanguage", ["postId", "language"]),

  // Comments on posts
  comments: defineTable({
    postId: v.id("posts"),
    parentCommentId: v.optional(v.id("comments")),
    authorId: v.id("members"),
    wardId: v.id("wards"),
    stakeId: v.id("stakes"),
    content: v.string(),
    status: v.union(
      v.literal("pending_review"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    moderationNotes: v.optional(v.string()),
  })
    .index("byPostIdAndStatus", ["postId", "status"])
    .index("byAuthorId", ["authorId"]),

  // Poll options for poll-type posts
  pollOptions: defineTable({
    postId: v.id("posts"),
    label: v.string(),
    position: v.number(),
  }).index("byPostId", ["postId"]),

  // Poll votes (one per member per poll)
  pollVotes: defineTable({
    postId: v.id("posts"),
    optionId: v.id("pollOptions"),
    memberId: v.id("members"),
  })
    .index("byPostIdAndMemberId", ["postId", "memberId"])
    .index("byOptionId", ["optionId"]),
});
