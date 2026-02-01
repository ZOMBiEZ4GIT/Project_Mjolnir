ALTER TABLE "contributions" ALTER COLUMN "employer_contrib" SET DATA TYPE numeric(18, 2);--> statement-breakpoint
ALTER TABLE "contributions" ALTER COLUMN "employer_contrib" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "contributions" ALTER COLUMN "employee_contrib" SET DATA TYPE numeric(18, 2);--> statement-breakpoint
ALTER TABLE "contributions" ALTER COLUMN "employee_contrib" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "snapshots" ALTER COLUMN "balance" SET DATA TYPE numeric(18, 2);--> statement-breakpoint
ALTER TABLE "contributions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "contributions" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "snapshots" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "snapshots" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_holding_id_date_unique" UNIQUE("holding_id","date");