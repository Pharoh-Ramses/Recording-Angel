import { uuid, integer, text, boolean, pgTable, varchar, pgEnum, date, timestamp } from "drizzle-orm/pg-core";

export const STATUS_ENUM = pgEnum("status", ["PENDING", "APPROVED", "REJECTED"]);
export const ROLE_ENUM = pgEnum("role", ["MEMBER", "BISHOP", "STAKEPRESIDENT", "MISSIONARY", "MISSIONPRESIDENT", "ADMIN"]);

export const users = pgTable("users", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  fullName: varchar("full_name").notNull(),
  email: text("email").notNull().unique(),
  ward: integer("ward").notNull().unique(),
  stake: integer("stake").notNull().unique(),
  password: text("password").notNull(),
  profilePicture: text("profile_picture").notNull(),
  status: STATUS_ENUM("status").default("PENDING"),
  role: ROLE_ENUM("role").default("MEMBER"),
  lastActivityDate: date("last_activity_date").defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

