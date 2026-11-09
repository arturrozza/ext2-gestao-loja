CREATE TYPE "stock_movement_type" AS ENUM('purchase', 'purchase_canceled', 'sale', 'sale_canceled', 'adjustment', 'cost_correction');--> statement-breakpoint
CREATE TABLE "purchase_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"store_id" uuid NOT NULL,
	"purchase_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit_cost" integer NOT NULL,
	"expiry" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_items_quantity_positive" CHECK ("quantity" > 0),
	CONSTRAINT "purchase_items_unit_cost_non_negative" CHECK ("unit_cost" >= 0),
	CONSTRAINT "purchase_items_expiry_first_day" CHECK (extract(day from "expiry") = 1)
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"store_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"date" date NOT NULL,
	"note" text,
	"user_id" uuid NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"purchase_item_id" uuid,
	"expiry" date,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_lots_quantity_non_negative" CHECK ("quantity" >= 0),
	CONSTRAINT "stock_lots_expiry_first_day" CHECK (extract(day from "expiry") = 1)
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "stock_movements_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"type" "stock_movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"value_change" integer NOT NULL,
	"unit_cost" integer NOT NULL,
	"stock_after" integer NOT NULL,
	"average_cost_after" integer NOT NULL,
	"lot_id" uuid,
	"purchase_item_id" uuid,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_movements_stock_after_non_negative" CHECK ("stock_after" >= 0),
	CONSTRAINT "stock_movements_average_cost_after_non_negative" CHECK ("average_cost_after" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_items_purchase_position_key" ON "purchase_items" ("purchase_id","position");--> statement-breakpoint
CREATE INDEX "purchase_items_product_id_index" ON "purchase_items" ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_store_number_key" ON "purchases" ("store_id","number");--> statement-breakpoint
CREATE INDEX "stock_lots_product_id_index" ON "stock_lots" ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_lots_purchase_item_key" ON "stock_lots" ("purchase_item_id");--> statement-breakpoint
CREATE INDEX "stock_movements_product_id_seq_index" ON "stock_movements" ("product_id","seq");--> statement-breakpoint
CREATE INDEX "stock_movements_purchase_item_id_index" ON "stock_movements" ("purchase_item_id");--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_store_id_stores_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id");--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_purchases_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id");--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id");--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_store_id_stores_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id");--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_store_id_stores_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id");--> statement-breakpoint
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id");--> statement-breakpoint
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_purchase_item_id_purchase_items_id_fkey" FOREIGN KEY ("purchase_item_id") REFERENCES "purchase_items"("id");--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_store_id_stores_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id");--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id");--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_lot_id_stock_lots_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "stock_lots"("id");--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_purchase_item_id_purchase_items_id_fkey" FOREIGN KEY ("purchase_item_id") REFERENCES "purchase_items"("id");--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");