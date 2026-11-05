CREATE TABLE "resellers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"store_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"default_commission" numeric(5,2) NOT NULL,
	"note" text,
	"search_text" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resellers_default_commission_range" CHECK ("default_commission" between 0 and 100)
);
--> statement-breakpoint
CREATE INDEX "resellers_store_id_name_index" ON "resellers" ("store_id","name");--> statement-breakpoint
ALTER TABLE "resellers" ADD CONSTRAINT "resellers_store_id_stores_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id");