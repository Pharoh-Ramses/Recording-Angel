import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { db } from "../index";
import { users, accounts, sessions, verifications } from "../db/schema";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			user: users,
			account: accounts,
			session: sessions,
			verification: verifications,
		},
	}),

	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false, // Will be handled by approval workflow
	},

	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // Update session every day
		cookieCache: {
			enabled: true,
			maxAge: 60 * 60 * 24 * 7, // 7 days
		},
	},

	socialProviders: {
		// Can add OAuth providers later
	},

	user: {
		additionalFields: {
			fullName: {
				type: "string",
				required: true,
			},
			ward: {
				type: "number",
				required: false,
			},
			stake: {
				type: "number",
				required: false,
			},
			status: {
				type: "string",
				required: false,
				defaultValue: "PENDING",
			},
			role: {
				type: "string",
				required: false,
				defaultValue: "MEMBER",
			},
			syncedAt: {
				type: "date",
				required: false,
			},
			lastSyncVersion: {
				type: "number",
				required: false,
				defaultValue: 0,
			},
		},
	},

	// Remove hooks temporarily to fix TypeScript errors
	// TODO: Add hooks back after fixing types

	trustedOrigins: [
		"http://localhost:5173",
		"http://localhost:5174",
		"http://localhost:3000",
		// Add production domains here
	],
});

export type AuthSession = typeof auth.$Infer.Session;
