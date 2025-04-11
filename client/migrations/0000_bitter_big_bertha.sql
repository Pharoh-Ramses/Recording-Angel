CREATE TYPE "public"."role" AS ENUM('MEMBER', 'BISHOP', 'STAKEPRESIDENT', 'MISSIONARY', 'MISSIONPRESIDENT', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar NOT NULL,
	"email" text NOT NULL,
	"ward" integer NOT NULL,
	"stake" integer NOT NULL,
	"password" text NOT NULL,
	"profile_picture" text NOT NULL,
	"status" "status" DEFAULT 'PENDING',
	"role" "role" DEFAULT 'MEMBER',
	"last_activity_date" date DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_id_unique" UNIQUE("id"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_ward_unique" UNIQUE("ward"),
	CONSTRAINT "users_stake_unique" UNIQUE("stake")
);
