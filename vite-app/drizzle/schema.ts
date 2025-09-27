import {
	pgTable,
	text,
	varchar,
	timestamp,
	boolean,
	integer,
	jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Removed user status enum - no approval process needed

// User role enum
export type UserRole =
	| "MEMBER"
	| "BISHOP"
	| "STAKEPRESIDENT"
	| "MISSIONARY"
	| "MISSIONPRESIDENT"
	| "ADMIN";



// Users table - minimal user data (Clerk handles authentication)
export const users = pgTable("users", {
	id: text("id").primaryKey(),
	email: varchar("email", { length: 255 }).unique().notNull(),
	name: varchar("name", { length: 100 }).notNull(),
	fullName: varchar("full_name", { length: 100 }).notNull(),
	emailVerified: boolean("email_verified")
		.$defaultFn(() => false)
		.notNull(),
	image: text("image"),

	// Church-specific fields (synced from Python API)
	ward: integer("ward"),
	stake: integer("stake"),
	role: varchar("role", { length: 20 })
		.$type<UserRole>()
		.default("MEMBER")
		.notNull(),

	// Sync tracking
	syncedAt: timestamp("synced_at"),
	lastSyncVersion: integer("last_sync_version").default(0),

	// Timestamps
	createdAt: timestamp("created_at")
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: timestamp("updated_at")
		.$defaultFn(() => new Date())
		.notNull(),
});

// Removed BetterAuth tables - Clerk handles authentication



// Relations (removed BetterAuth-specific relations)
export const usersRelations = relations(users, ({ many }) => ({
	// No auth-related relations since Clerk handles authentication
}));

// TypeScript types derived from schema
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Removed BetterAuth types - using Clerk for authentication


