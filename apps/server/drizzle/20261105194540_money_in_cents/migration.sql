-- Money in integer cents and percentages in basis points (docs/decisions.md, 2026-11-05). Edited by hand: the
-- generated `USING "column"::integer` rounds the old decimal (92.50 → 93) instead of converting it (92.50 → 9250).
-- `numeric(12,2)` and `numeric(5,2)` have exactly two places, so `× 100` is always a whole number and the cast never
-- rounds; a value too large for an integer fails the cast and rolls back every migration of the deploy.
-- Changing a column's type rewrites the table without firing row triggers, so `audit_log` keeps no entry for it.
-- The old checks and defaults are in the old scale: they go before the conversion and come back in the new one.
ALTER TABLE "products"
	ALTER COLUMN "base_price" SET DATA TYPE integer USING ("base_price" * 100)::integer,
	ADD CONSTRAINT "products_base_price_positive" CHECK ("base_price" > 0);--> statement-breakpoint
ALTER TABLE "resellers"
	DROP CONSTRAINT "resellers_default_commission_range",
	ALTER COLUMN "default_commission" SET DATA TYPE integer USING ("default_commission" * 100)::integer,
	ADD CONSTRAINT "resellers_default_commission_range" CHECK ("default_commission" between 0 and 10000);--> statement-breakpoint
ALTER TABLE "stores"
	ALTER COLUMN "default_tax_percent" DROP DEFAULT,
	ALTER COLUMN "mercado_livre_fee_percent" DROP DEFAULT,
	ALTER COLUMN "low_margin_percent" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "stores"
	ALTER COLUMN "default_tax_percent" SET DATA TYPE integer USING ("default_tax_percent" * 100)::integer,
	ALTER COLUMN "mercado_livre_fee_percent" SET DATA TYPE integer USING ("mercado_livre_fee_percent" * 100)::integer,
	ALTER COLUMN "low_margin_percent" SET DATA TYPE integer USING ("low_margin_percent" * 100)::integer,
	ALTER COLUMN "default_tax_percent" SET DEFAULT 0,
	ALTER COLUMN "mercado_livre_fee_percent" SET DEFAULT 0,
	ALTER COLUMN "low_margin_percent" SET DEFAULT 1000,
	ADD CONSTRAINT "stores_default_tax_percent_range" CHECK ("default_tax_percent" between 0 and 10000),
	ADD CONSTRAINT "stores_mercado_livre_fee_percent_range" CHECK ("mercado_livre_fee_percent" between 0 and 10000),
	ADD CONSTRAINT "stores_low_margin_percent_range" CHECK ("low_margin_percent" between 0 and 10000);
