CREATE TYPE "stock_adjustment_reason" AS ENUM('count', 'damage', 'loss', 'expired_discarded', 'gift_internal_use', 'other');--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "reason" "stock_adjustment_reason";--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_reason_on_adjustment" CHECK (("type" = 'adjustment') = ("reason" is not null));