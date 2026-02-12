CREATE TYPE "public"."saver_type" AS ENUM('spending', 'savings_goal', 'investment');--> statement-breakpoint
CREATE TABLE "budget_savers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"saver_key" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"emoji" varchar(10) NOT NULL,
	"monthly_budget_cents" bigint NOT NULL,
	"saver_type" "saver_type" NOT NULL,
	"sort_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"colour" varchar(7) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_savers_saver_key_unique" UNIQUE("saver_key")
);
