ALTER TABLE "ai_recommendations" ADD COLUMN "overall_status" varchar(10);--> statement-breakpoint
ALTER TABLE "ai_recommendations" ADD COLUMN "saver_statuses" jsonb;--> statement-breakpoint
ALTER TABLE "ai_recommendations" ADD COLUMN "goal_progress" jsonb;--> statement-breakpoint
ALTER TABLE "ai_recommendations" ADD COLUMN "budget_adjustments" jsonb;--> statement-breakpoint
ALTER TABLE "ai_recommendations" ADD COLUMN "insights" jsonb;--> statement-breakpoint
ALTER TABLE "ai_recommendations" ADD COLUMN "actionable_tip" text;--> statement-breakpoint
ALTER TABLE "ai_recommendations" ADD COLUMN "savings_projection" jsonb;--> statement-breakpoint
ALTER TABLE "ai_recommendations" ADD COLUMN "raw_response" jsonb;--> statement-breakpoint
ALTER TABLE "ai_recommendations" ADD COLUMN "generated_at" timestamp with time zone;