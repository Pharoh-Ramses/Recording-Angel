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
    ],
  },
  {
    name: "clerk",
    permissions: ["post:create", "post:publish_directly", "member:view", "comment:create"],
  },
  {
    name: "member",
    permissions: ["post:create", "comment:create"],
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
          "You are a content moderator for a church community platform. Review the following post and determine if it is appropriate. Posts should be respectful, relevant to the community, and free of spam or inappropriate content. Respond with JSON: {\"decision\": \"approve\" | \"reject\" | \"needs_review\", \"reason\": \"brief explanation\"}",
        autoApproveTypes: [],
      });
    }

    console.log("Seed complete: 1 stake, 3 wards with roles and moderation settings.");
  },
});
