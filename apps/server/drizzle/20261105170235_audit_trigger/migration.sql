-- Audit log (docs/architecture.md, "Auditoria"): every insert, update and delete on a business table is written to
-- audit_log with who did it, when, the row before and after, and the changed columns.
--
-- Who: the app sets `app.actor` (a user id, or 'system') in the write's transaction with `audited()` in
-- src/db/audit.ts. A write without it is refused, so nothing changes without an author.
-- Trigger arguments: columns never copied into the log (secrets such as password_hash); an update still lists them in
-- changed_fields, by name only.
CREATE FUNCTION audit_row_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
	actor text := current_setting('app.actor', true);
	old_row jsonb := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END;
	new_row jsonb := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END;
	row_data jsonb := coalesce(new_row, old_row);
	changed text[];
BEGIN
	IF actor IS NULL OR actor = '' THEN
		RAISE EXCEPTION 'audit: % on % without an actor; wrap the write in audited()', TG_OP, TG_TABLE_NAME;
	END IF;

	IF TG_OP = 'UPDATE' THEN
		SELECT coalesce(array_agg(n.key ORDER BY n.key), '{}') INTO changed
		FROM jsonb_each(new_row) AS n
		WHERE n.key <> 'updated_at' AND n.value IS DISTINCT FROM (old_row -> n.key);
		-- Nothing really changed (e.g. archiving what was already archived): nothing to log.
		IF cardinality(changed) = 0 THEN
			RETURN NULL;
		END IF;
	END IF;

	-- clock_timestamp(), not now(): the moment of the change, so a transaction that waited on a lock still sorts after
	-- the one it waited for, and several changes in one transaction keep their order.
	INSERT INTO public.audit_log
		(store_id, table_name, record_id, action, user_id, old_values, new_values, changed_fields, created_at)
	VALUES (
		-- A store is its own store.
		(CASE WHEN TG_TABLE_NAME = 'stores' THEN row_data ->> 'id' ELSE row_data ->> 'store_id' END)::uuid,
		TG_TABLE_NAME,
		(row_data ->> 'id')::uuid,
		lower(TG_OP),
		CASE WHEN actor = 'system' THEN NULL ELSE actor::uuid END,
		old_row - coalesce(TG_ARGV, '{}'),
		new_row - coalesce(TG_ARGV, '{}'),
		changed,
		clock_timestamp()
	);
	RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION audit_log_append_only() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
	RAISE EXCEPTION 'audit_log is append-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_log_append_only BEFORE UPDATE OR DELETE ON audit_log
	FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();
--> statement-breakpoint
CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON stores
	FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON users
	FOR EACH ROW EXECUTE FUNCTION audit_row_change('password_hash');
--> statement-breakpoint
CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON categories
	FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON products
	FOR EACH ROW EXECUTE FUNCTION audit_row_change();
