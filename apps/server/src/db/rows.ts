import { type SQL, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

/** The one row an `INSERT ... RETURNING` gave back. */
export function insertedRow<T>(rows: T[]): T {
	const [row] = rows;
	if (!row) throw new Error("insert returned no row");
	return row;
}

/** `archived_at` of an archive toggle: archiving again keeps the first date, reactivating clears it. */
export function archivedAtValue(
	column: PgColumn,
	archived: boolean,
): SQL | null {
	return archived ? sql`coalesce(${column}, now())` : null;
}
