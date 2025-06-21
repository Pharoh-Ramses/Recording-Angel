import {
  uuid,
  integer,
  text,
  boolean,
  pgTable,
  varchar,
  pgEnum,
  date,
  timestamp,
} from "drizzle-orm/pg-core";

export const STATUS_ENUM = pgEnum("status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);
export const ROLE_ENUM = pgEnum("role", [
  "MEMBER",
  "BISHOP",
  "STAKEPRESIDENT",
  "MISSIONARY",
  "MISSIONPRESIDENT",
  "ADMIN",
]);

export const users = pgTable("users", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  fullName: varchar("full_name").notNull(),
  email: text("email").notNull().unique(),
  ward: integer("ward").notNull(),
  stake: integer("stake").notNull(),
  password: text("password").notNull(),
  profilePicture: text("profile_picture").notNull(),
  status: STATUS_ENUM("status").default("PENDING"),
  role: ROLE_ENUM("role").default("MEMBER"),
  lastActivityDate: date("last_activity_date").defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  code: text("code").notNull(),
  host_id: uuid("host_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const transcriptions = pgTable("transcriptions", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  session_id: uuid("session_id")
    .notNull()
    .references(() => sessions.id),
  text: text("text").notNull(),
  language: varchar("language").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  speaker_id: uuid("speaker_id")
    .notNull()
    .references(() => users.id),
});

export const sessionParticipants = pgTable("session_participants", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  session_id: uuid("session_id")
    .notNull()
    .references(() => sessions.id),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id),
  role: ROLE_ENUM("role").notNull(),
});

export const translations = pgTable("translations", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  original_transcription_id: uuid("original_transcription_id")
    .notNull()
    .references(() => transcriptions.id),
  langage: varchar("langage").notNull(),
  translated_text: text("translated_text").notNull(),
  source_language: varchar("source_language").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updateAt: timestamp("update_at", { withTimezone: true }),
});
