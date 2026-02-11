import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users linked to WorkOS identities
  users: defineTable({
    name: v.string(),
    email: v.string(),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),

  // Stakes (top-level org unit)
  stakes: defineTable({
    name: v.string(),
    supportedLanguages: v.array(v.union(v.literal("en"), v.literal("es"))),
    createdBy: v.id("users"),
  }).searchIndex("search_name", {
    searchField: "name",
  }),

  // Wards belong to a stake
  wards: defineTable({
    name: v.string(),
    stakeId: v.id("stakes"),
    supportedLanguages: v.optional(
      v.array(v.union(v.literal("en"), v.literal("es"))),
    ),
    createdBy: v.id("users"),
  })
    .index("by_stake", ["stakeId"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["stakeId"],
    }),

  // Memberships link users to orgs with roles
  memberships: defineTable({
    userId: v.id("users"),
    orgType: v.union(v.literal("stake"), v.literal("ward")),
    orgId: v.string(),
    role: v.union(v.literal("leader"), v.literal("member")),
  })
    .index("by_user", ["userId"])
    .index("by_org", ["orgType", "orgId"])
    .index("by_user_org", ["userId", "orgType", "orgId"]),
});
