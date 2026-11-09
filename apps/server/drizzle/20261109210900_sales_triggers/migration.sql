-- Sales are business data: every change goes to audit_log (see 20261105170235_audit_trigger).
CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON sales
	FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON sale_items
	FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON sale_item_lots
	FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON sale_costs
	FOR EACH ROW EXECUTE FUNCTION audit_row_change();
