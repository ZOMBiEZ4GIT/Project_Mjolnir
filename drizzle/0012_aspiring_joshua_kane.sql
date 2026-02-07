CREATE TABLE "payday_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payday_day" integer NOT NULL,
	"adjust_for_weekends" boolean DEFAULT true NOT NULL,
	"income_source_pattern" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
