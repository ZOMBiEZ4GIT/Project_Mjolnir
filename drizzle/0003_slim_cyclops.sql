CREATE TYPE "public"."price_cache_source" AS ENUM('yahoo', 'coingecko');--> statement-breakpoint
ALTER TYPE "public"."transaction_action" ADD VALUE 'DIVIDEND';--> statement-breakpoint
ALTER TYPE "public"."transaction_action" ADD VALUE 'SPLIT';--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "quantity" SET DATA TYPE numeric(18, 8);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "unit_price" SET DATA TYPE numeric(18, 8);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "fees" SET DATA TYPE numeric(18, 8);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "fees" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "price_cache" ADD COLUMN "change_percent" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "price_cache" ADD COLUMN "change_absolute" numeric(20, 8);--> statement-breakpoint
ALTER TABLE "price_cache" ADD COLUMN "source" "price_cache_source" NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "price_cache" ADD CONSTRAINT "price_cache_symbol_unique" UNIQUE("symbol");