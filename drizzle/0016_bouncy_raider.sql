ALTER TABLE "budget_categories" ADD COLUMN "saver_id" uuid;--> statement-breakpoint
ALTER TABLE "budget_categories" ADD COLUMN "category_key" varchar(50);--> statement-breakpoint
ALTER TABLE "budget_categories" ADD COLUMN "monthly_budget_cents" bigint;--> statement-breakpoint
ALTER TABLE "budget_categories" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_saver_id_budget_savers_id_fk" FOREIGN KEY ("saver_id") REFERENCES "public"."budget_savers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_saver_id_category_key_unique" UNIQUE("saver_id","category_key");