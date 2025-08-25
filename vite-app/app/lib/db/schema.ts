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

// User status enum
export type UserStatus = "PENDING" | "APPROVED" | "REJECTED";

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

// Users table - authentication focused (BetterAuth compatible)
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
	status: varchar("status", { length: 20 })
		.$type<UserStatus>()
		.default("PENDING")
		.notNull(),
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

// BetterAuth accounts table
export const accounts = pgTable("accounts", {
	id: text("id").primaryKey(),
	accountId: varchar("account_id", { length: 255 }).notNull(),
	providerId: varchar("provider_id", { length: 255 }).notNull(),
	userId: text("user_id")
		.references(() => users.id, { onDelete: "cascade" })
		.notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"), // For email/password provider
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

// BetterAuth sessions table
export const sessions = pgTable("sessions", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").unique().notNull(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.references(() => users.id, { onDelete: "cascade" })
		.notNull(),
});

// BetterAuth verification table
export const verifications = pgTable("verifications", {
	id: text("id").primaryKey(),
	identifier: varchar("identifier", { length: 255 }).notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});

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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
	accounts: many(accounts),
	sessions: many(sessions),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id],
	}),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id],
	}),
}));

// TypeScript types derived from schema
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type SyncEvent = typeof syncEvents.$inferSelect;
export type NewSyncEvent = typeof syncEvents.$inferInsert;

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
