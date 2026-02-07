CREATE TYPE "public"."up_account_type" AS ENUM('TRANSACTIONAL', 'SAVER', 'HOME_LOAN');--> statement-breakpoint
CREATE TYPE "public"."up_transaction_status" AS ENUM('HELD', 'SETTLED');--> statement-breakpoint
CREATE TABLE "up_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"up_account_id" varchar(255) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"account_type" "up_account_type" NOT NULL,
	"balance_cents" bigint DEFAULT 0 NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "up_accounts_up_account_id_unique" UNIQUE("up_account_id")
);
--> statement-breakpoint
CREATE TABLE "up_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"up_transaction_id" varchar(255) NOT NULL,
	"description" varchar(512) NOT NULL,
	"raw_text" varchar(512),
	"amount_cents" bigint NOT NULL,
	"status" "up_transaction_status" NOT NULL,
	"up_category_id" varchar(255),
	"up_category_name" varchar(255),
	"mjolnir_category_id" varchar(255),
	"transaction_date" date NOT NULL,
	"settled_at" timestamp with time zone,
	"is_transfer" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "up_transactions_up_transaction_id_unique" UNIQUE("up_transaction_id")
);
--> statement-breakpoint
CREATE INDEX "up_transactions_transaction_date_idx" ON "up_transactions" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "up_transactions_mjolnir_category_id_idx" ON "up_transactions" USING btree ("mjolnir_category_id");--> statement-breakpoint
CREATE INDEX "up_transactions_status_idx" ON "up_transactions" USING btree ("status");