import {
	index,
	jsonb,
	snakeCase,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

/**
 * Every insert, update and delete on the audited tables, written by the `audit_row_change` trigger (see the
 * `audit_trigger` migration), never by the app. Append-only: the trigger `audit_log_append_only` refuses changes.
 */
export const auditLog = snakeCase.table(
	"audit_log",
	{
		id: uuid().primaryKey().defaultRandom(),
		/** Not a foreign key: the log outlives anything it points to. */
		storeId: uuid(),
		tableName: text().notNull(),
		recordId: uuid().notNull(),
		action: text({ enum: ["insert", "update", "delete"] }).notNull(),
		/** Who did it; `null` for the system (seed, migrations). */
		userId: uuid(),
		/** The row before (update, delete) and after (insert, update), secret columns left out. */
		oldValues: jsonb(),
		newValues: jsonb(),
		/** Columns an update changed (secret ones included, by name only; `updated_at` never). */
		changedFields: text().array(),
		// Only `createdAt`: a log row is never updated.
		createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index().on(table.tableName, table.recordId),
		index().on(table.storeId, table.createdAt),
	],
);
