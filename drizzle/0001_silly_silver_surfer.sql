ALTER TYPE "public"."transaction_action" ADD VALUE 'DIVIDEND';--> statement-breakpoint
ALTER TYPE "public"."transaction_action" ADD VALUE 'SPLIT';--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "quantity" SET DATA TYPE numeric(18, 8);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "unit_price" SET DATA TYPE numeric(18, 8);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "fees" SET DATA TYPE numeric(18, 8);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "fees" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "deleted_at" timestamp with time zone;