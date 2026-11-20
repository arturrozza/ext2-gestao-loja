ALTER TABLE "sales" ADD COLUMN "due_date" date;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "paid_at" date;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "payment_method" DROP NOT NULL;--> statement-breakpoint
-- Sales made before the payment was tracked count as paid on their day; a term one is due that same day.
UPDATE "sales" SET "paid_at" = "date", "due_date" = CASE WHEN "payment_condition" = 'term' THEN "date" END;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_payment_by_condition" CHECK (("payment_condition" = 'cash' and "due_date" is null and "paid_at" = "date")
				or ("payment_condition" = 'term' and "due_date" >= "date"));--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_payment_method_goes_with_paid_at" CHECK (("paid_at" is null) = ("payment_method" is null));--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_paid_not_before_sale" CHECK ("paid_at" is null or "paid_at" >= "date");