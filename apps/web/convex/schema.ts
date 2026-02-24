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

  // Posts (core content)
  posts: defineTable({
    authorId: v.id("members"),
    wardId: v.id("wards"),
    stakeId: v.id("stakes"),
    scope: v.union(v.literal("ward"), v.literal("stake")),
    type: v.union(
      v.literal("announcement"),
      v.literal("event"),
      v.literal("classifieds")
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
  })
    .index("byWardIdAndStatus", ["wardId", "status"])
    .index("byStakeIdAndScopeAndStatus", ["stakeId", "scope", "status"])
    .index("byAuthorId", ["authorId"]),

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
  })
    .index("byPostId", ["postId"])
    .index("byPostIdAndLanguage", ["postId", "language"]),
});
