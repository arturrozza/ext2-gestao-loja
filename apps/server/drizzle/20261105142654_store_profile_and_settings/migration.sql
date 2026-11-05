ALTER TABLE "stores" ADD COLUMN "document" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "default_tax_percent" numeric(5,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "mercado_livre_fee_percent" numeric(5,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "expiry_warning_days" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "stale_product_days" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "low_margin_percent" numeric(5,2) DEFAULT '10' NOT NULL;