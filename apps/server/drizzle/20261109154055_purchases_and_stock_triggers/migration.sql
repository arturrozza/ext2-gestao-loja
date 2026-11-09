-- Purchases and stock are business data: every change goes to audit_log (see 20261105170235_audit_trigger).
CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON purchases
	FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON purchase_items
	FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON stock_lots
	FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON stock_movements
	FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
-- The stock ledger is never rewritten (docs/product/estoque.md): a correction is a new movement. The value of a
-- product's stock is the sum of its movements, so changing one would silently change that value.
CREATE FUNCTION stock_movements_append_only() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
	RAISE EXCEPTION 'stock_movements is append-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER stock_movements_append_only BEFORE UPDATE OR DELETE ON stock_movements
	FOR EACH ROW EXECUTE FUNCTION stock_movements_append_only();
