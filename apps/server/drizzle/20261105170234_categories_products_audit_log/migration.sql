CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"store_id" uuid,
	"table_name" text NOT NULL,
	"record_id" uuid NOT NULL,
	"action" text NOT NULL,
	"user_id" uuid,
	"old_values" jsonb,
	"new_values" jsonb,
	"changed_fields" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"store_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"store_id" uuid NOT NULL,
	"category_id" uuid,
	"name" text NOT NULL,
	"base_price" numeric(12,2) NOT NULL,
	"barcode" text,
	"internal_code" text,
	"min_stock" integer,
	"location" text,
	"has_expiry" boolean DEFAULT false NOT NULL,
	"search_text" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_log_table_name_record_id_index" ON "audit_log" ("table_name","record_id");--> statement-breakpoint
CREATE INDEX "audit_log_store_id_created_at_index" ON "audit_log" ("store_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_store_id_normalized_name_index" ON "categories" ("store_id","normalized_name");--> statement-breakpoint
CREATE UNIQUE INDEX "products_store_barcode_key" ON "products" ("store_id","barcode");--> statement-breakpoint
CREATE UNIQUE INDEX "products_store_internal_code_key" ON "products" ("store_id",lower("internal_code"));--> statement-breakpoint
CREATE INDEX "products_store_id_name_index" ON "products" ("store_id","name");--> statement-breakpoint
CREATE INDEX "products_category_id_index" ON "products" ("category_id");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_store_id_stores_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_stores_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id");