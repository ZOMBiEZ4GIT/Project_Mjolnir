ALTER TABLE "user_preferences" ADD COLUMN "email_reminders" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "reminder_day" integer DEFAULT 1 NOT NULL;