CREATE TYPE "public"."goal_status" AS ENUM('active', 'completed', 'paused');--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"saver_id" uuid,
	"name" varchar(100) NOT NULL,
	"target_amount_cents" bigint NOT NULL,
	"current_amount_cents" bigint DEFAULT 0 NOT NULL,
	"monthly_contribution_cents" bigint NOT NULL,
	"target_date" date,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"colour" varchar(7),
	"icon" varchar(10),
	"notes" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_saver_id_budget_savers_id_fk" FOREIGN KEY ("saver_id") REFERENCES "public"."budget_savers"("id") ON DELETE no action ON UPDATE no action;