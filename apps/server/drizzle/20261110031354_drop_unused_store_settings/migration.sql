ALTER TABLE "stores" DROP CONSTRAINT "stores_low_margin_percent_range";--> statement-breakpoint
ALTER TABLE "stores" DROP COLUMN "stale_product_days";--> statement-breakpoint
ALTER TABLE "stores" DROP COLUMN "low_margin_percent";