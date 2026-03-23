import { internalMutation } from "./_generated/server";
import { ALL_PERMISSIONS } from "./lib/permissions";

const WARD_SYSTEM_ROLES = [
  {
    name: "bishop",
    permissions: [...ALL_PERMISSIONS],
  },
  {
    name: "bishopric",
    permissions: [
      "post:create",
      "post:publish_directly",
      "post:approve",
      "member:approve",
      "comment:create",
      "comment:moderate",
      "live:manage",
    ],
  },
  {
    name: "clerk",
    permissions: [
      "post:create",
      "post:publish_directly",
      "member:view",
      "comment:create",
    ],
  },
  {
    name: "member",
    permissions: ["post:create", "comment:create"],
  },
  {
    name: "ward_mission_leader",
    permissions: [
      "missionary:view",
      "missionary:manage",
      "missionary_assignment:manage",
      "companionship:manage",
      "missionary_calendar:manage",
      "missionary_calendar_group:manage",
      "missionary_post:approve",
    ],
  },
];

const STAKE_SYSTEM_ROLES = [
  {
    name: "stake_president",
    permissions: [...ALL_PERMISSIONS],
  },
  {
    name: "stake_clerk",
    permissions: ["post:create", "post:publish_directly", "comment:create"],
  },
];

export const seedStakeAndWards = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existingStakes = await ctx.db.query("stakes").collect();
    if (existingStakes.length > 0) {
      console.log("Already seeded, skipping.");
      return;
    }

    // Create stake
    const stakeId = await ctx.db.insert("stakes", {
      name: "Example Stake",
      slug: "example-stake",
      languages: ["en", "es"],
      settings: {},
    });

    // Create stake-level roles
    for (const role of STAKE_SYSTEM_ROLES) {
      await ctx.db.insert("roles", {
        ...role,
        stakeId,
        isSystem: true,
        level: "stake",
      });
    }

    // Create wards
    const wardNames = [
      { name: "1st Ward", slug: "1st-ward" },
      { name: "2nd Ward", slug: "2nd-ward" },
      { name: "3rd Ward", slug: "3rd-ward" },
    ];

    for (const ward of wardNames) {
      const wardId = await ctx.db.insert("wards", {
        name: ward.name,
        slug: ward.slug,
        stakeId,
        settings: {},
      });

      // Create ward-level system roles
      for (const role of WARD_SYSTEM_ROLES) {
        await ctx.db.insert("roles", {
          ...role,
          wardId,
          isSystem: true,
          level: "ward",
        });
      }

      // Create default moderation settings
      await ctx.db.insert("moderationSettings", {
        wardId,
        level: "ward",
        aiPrompt:
          'You are a content moderator for a church community platform. Review the following post and determine if it is appropriate. Posts should be respectful, relevant to the community, and free of spam or inappropriate content. Respond with JSON: {"decision": "approve" | "reject" | "needs_review", "reason": "brief explanation"}',
        autoApproveTypes: [],
      });
    }

    console.log(
      "Seed complete: 1 stake, 3 wards with roles and moderation settings.",
    );
  },
});

// Backfill: sync existing system role permissions with current config
export const syncRolePermissions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allRoles = await ctx.db.query("roles").collect();
    const lookup = Object.fromEntries(
      [...WARD_SYSTEM_ROLES, ...STAKE_SYSTEM_ROLES].map((r) => [
        r.name,
        r.permissions,
      ]),
    );

    let updated = 0;
    let created = 0;
    for (const role of allRoles) {
      if (!role.isSystem) continue;
      const expected = lookup[role.name];
      if (!expected) continue;

      const current = JSON.stringify(role.permissions.slice().sort());
      const target = JSON.stringify(expected.slice().sort());
      if (current !== target) {
        await ctx.db.patch(role._id, { permissions: expected });
        updated++;
      }
    }

    const wards = await ctx.db.query("wards").collect();
    for (const ward of wards) {
      const wardRoles = await ctx.db
        .query("roles")
        .withIndex("byWardId", (q) => q.eq("wardId", ward._id))
        .collect();
      const existingSystemRoleNames = new Set(
        wardRoles.filter((role) => role.isSystem).map((role) => role.name),
      );

      for (const role of WARD_SYSTEM_ROLES) {
        if (existingSystemRoleNames.has(role.name)) continue;

        await ctx.db.insert("roles", {
          ...role,
          wardId: ward._id,
          isSystem: true,
          level: "ward",
        });
        created++;
      }
    }

    console.log(
      `syncRolePermissions: updated ${updated} roles, created ${created} roles`,
    );
  },
});
