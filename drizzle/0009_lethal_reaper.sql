CREATE TYPE "public"."import_type" AS ENUM('transactions', 'snapshots');--> statement-breakpoint
CREATE TABLE "import_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "import_type" NOT NULL,
	"filename" text NOT NULL,
	"total" integer NOT NULL,
	"imported" integer NOT NULL,
	"skipped" integer NOT NULL,
	"errors_json" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_history" ADD CONSTRAINT "import_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;