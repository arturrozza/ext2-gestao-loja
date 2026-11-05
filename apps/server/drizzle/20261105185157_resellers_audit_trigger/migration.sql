-- Resellers are business data: every change goes to audit_log (see 20261105170235_audit_trigger).
CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON resellers
	FOR EACH ROW EXECUTE FUNCTION audit_row_change();
