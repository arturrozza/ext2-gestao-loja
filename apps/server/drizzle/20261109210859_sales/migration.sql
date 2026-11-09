CREATE TYPE "payment_condition" AS ENUM('cash', 'term');--> statement-breakpoint
CREATE TYPE "payment_method" AS ENUM('pix', 'cash', 'credit', 'debit');--> statement-breakpoint
CREATE TYPE "sale_channel" AS ENUM('store', 'mercado_livre', 'reseller');--> statement-breakpoint
CREATE TYPE "sale_cost_kind" AS ENUM('freight', 'tax', 'platform_fee', 'commission', 'other');--> statement-breakpoint
CREATE TYPE "sale_cost_mode" AS ENUM('amount', 'percent');--> statement-breakpoint
CREATE TABLE "sale_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"store_id" uuid NOT NULL,
	"sale_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"kind" "sale_cost_kind" NOT NULL,
	"mode" "sale_cost_mode" NOT NULL,
	"value" integer NOT NULL,
	"label" text,
	"amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sale_costs_value_range" CHECK ("value" >= 0 and ("mode" = 'amount' or "value" <= 10000)),
	CONSTRAINT "sale_costs_amount_non_negative" CHECK ("amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sale_item_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"store_id" uuid NOT NULL,
	"sale_item_id" uuid NOT NULL,
	"lot_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sale_item_lots_quantity_positive" CHECK ("quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"store_id" uuid NOT NULL,
	"sale_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"unit_cost" integer NOT NULL,
	"cost" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sale_items_quantity_positive" CHECK ("quantity" > 0),
	CONSTRAINT "sale_items_unit_price_non_negative" CHECK ("unit_price" >= 0),
	CONSTRAINT "sale_items_unit_cost_non_negative" CHECK ("unit_cost" >= 0),
	CONSTRAINT "sale_items_cost_non_negative" CHECK ("cost" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"store_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"date" date NOT NULL,
	"channel" "sale_channel" NOT NULL,
	"reseller_id" uuid,
	"customer_id" uuid,
	"payment_condition" "payment_condition" NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"discount" integer NOT NULL,
	"surcharge" integer NOT NULL,
	"revenue" integer NOT NULL,
	"products_cost" bigint NOT NULL,
	"sale_costs" bigint NOT NULL,
	"profit" bigint NOT NULL,
	"user_id" uuid NOT NULL,
	"canceled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_reseller_on_reseller_channel" CHECK (("channel" = 'reseller') = ("reseller_id" is not null)),
	CONSTRAINT "sales_discount_non_negative" CHECK ("discount" >= 0),
	CONSTRAINT "sales_surcharge_non_negative" CHECK ("surcharge" >= 0),
	CONSTRAINT "sales_revenue_non_negative" CHECK ("revenue" >= 0),
	CONSTRAINT "sales_profit_adds_up" CHECK ("profit" = "revenue" - "products_cost" - "sale_costs")
);
--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "sale_item_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "sale_costs_sale_position_key" ON "sale_costs" ("sale_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "sale_item_lots_item_lot_key" ON "sale_item_lots" ("sale_item_id","lot_id");--> statement-breakpoint
CREATE INDEX "sale_item_lots_lot_id_index" ON "sale_item_lots" ("lot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sale_items_sale_position_key" ON "sale_items" ("sale_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "sale_items_sale_product_key" ON "sale_items" ("sale_id","product_id");--> statement-breakpoint
CREATE INDEX "sale_items_product_id_index" ON "sale_items" ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_store_number_key" ON "sales" ("store_id","number");--> statement-breakpoint
CREATE INDEX "sales_store_id_date_index" ON "sales" ("store_id","date");--> statement-breakpoint
CREATE INDEX "sales_reseller_id_index" ON "sales" ("reseller_id");--> statement-breakpoint
CREATE INDEX "sales_customer_id_index" ON "sales" ("customer_id");--> statement-breakpoint
CREATE INDEX "stock_movements_sale_item_id_index" ON "stock_movements" ("sale_item_id");--> statement-breakpoint
ALTER TABLE "sale_costs" ADD CONSTRAINT "sale_costs_store_id_stores_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id");--> statement-breakpoint
ALTER TABLE "sale_costs" ADD CONSTRAINT "sale_costs_sale_id_sales_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id");--> statement-breakpoint
ALTER TABLE "sale_item_lots" ADD CONSTRAINT "sale_item_lots_store_id_stores_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id");--> statement-breakpoint
ALTER TABLE "sale_item_lots" ADD CONSTRAINT "sale_item_lots_sale_item_id_sale_items_id_fkey" FOREIGN KEY ("sale_item_id") REFERENCES "sale_items"("id");--> statement-breakpoint
ALTER TABLE "sale_item_lots" ADD CONSTRAINT "sale_item_lots_lot_id_stock_lots_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "stock_lots"("id");--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_store_id_stores_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id");--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id");--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id");--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_store_id_stores_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id");--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_reseller_id_resellers_id_fkey" FOREIGN KEY ("reseller_id") REFERENCES "resellers"("id");--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id");--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_sale_item_id_sale_items_id_fkey" FOREIGN KEY ("sale_item_id") REFERENCES "sale_items"("id");--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_one_origin" CHECK (num_nonnulls("purchase_item_id", "sale_item_id") <= 1);