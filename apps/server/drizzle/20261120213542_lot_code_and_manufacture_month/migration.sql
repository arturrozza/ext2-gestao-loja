ALTER TABLE "purchase_items" ADD COLUMN "lot_code" text;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD COLUMN "manufactured_on" date;--> statement-breakpoint
ALTER TABLE "stock_lots" ADD COLUMN "lot_code" text;--> statement-breakpoint
ALTER TABLE "stock_lots" ADD COLUMN "manufactured_on" date;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_manufactured_first_day" CHECK (extract(day from "manufactured_on") = 1);--> statement-breakpoint
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_manufactured_first_day" CHECK (extract(day from "manufactured_on") = 1);