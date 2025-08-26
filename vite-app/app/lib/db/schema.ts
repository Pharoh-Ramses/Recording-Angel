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

// Sync status enum
export type SyncStatus = "pending" | "success" | "failed" | "retrying";

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

// Webhook sync tracking for outbound events (React → Python)
export const syncEvents = pgTable("sync_events", {
	id: text("id").primaryKey(),
	entityType: varchar("entity_type", { length: 50 }).notNull(), // 'user', 'session'
	entityId: text("entity_id").notNull(),
	action: varchar("action", { length: 20 }).notNull(), // 'create', 'update', 'delete'
	status: varchar("status", { length: 20 })
		.$type<SyncStatus>()
		.default("pending")
		.notNull(),
	payload: jsonb("payload"),
	error: text("error"),
	retryCount: integer("retry_count").default(0),
	nextRetryAt: timestamp("next_retry_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	processedAt: timestamp("processed_at"),
});

// Webhook event log for inbound events (Python → React)
export const webhookEvents = pgTable("webhook_events", {
	id: text("id").primaryKey(),
	source: varchar("source", { length: 50 }).notNull(), // 'python_api'
	eventType: varchar("event_type", { length: 100 }).notNull(), // 'user.approved', 'user.role_changed'
	payload: jsonb("payload"),
	signature: text("signature"), // Webhook signature for verification
	processed: boolean("processed").default(false),
	processingError: text("processing_error"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	processedAt: timestamp("processed_at"),
});

// Relations (removed BetterAuth-specific relations)
export const usersRelations = relations(users, ({ many }) => ({
	// No auth-related relations since Clerk handles authentication
}));

// TypeScript types derived from schema
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Removed BetterAuth types - using Clerk for authentication

export type SyncEvent = typeof syncEvents.$inferSelect;
export type NewSyncEvent = typeof syncEvents.$inferInsert;

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
