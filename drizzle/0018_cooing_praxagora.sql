ALTER TABLE "up_transactions" ADD COLUMN "saver_key" varchar(50);--> statement-breakpoint
ALTER TABLE "up_transactions" ADD COLUMN "category_key" varchar(50);--> statement-breakpoint
ALTER TABLE "up_transactions" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
CREATE INDEX "up_transactions_saver_key_idx" ON "up_transactions" USING btree ("saver_key");--> statement-breakpoint
CREATE INDEX "up_transactions_category_key_idx" ON "up_transactions" USING btree ("category_key");--> statement-breakpoint
CREATE INDEX "up_transactions_saver_category_key_idx" ON "up_transactions" USING btree ("saver_key","category_key");--> statement-breakpoint
CREATE INDEX "up_transactions_tags_idx" ON "up_transactions" USING gin ("tags");