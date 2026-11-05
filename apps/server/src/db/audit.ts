import { sql } from "drizzle-orm";
import { db } from ".";

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Where a query runs: the pool, or the transaction of an audited write. */
export type Executor = typeof db | Transaction;

/**
 * Runs `write` in a transaction attributed to `actor`: a user id, or `"system"` (seed, migrations, test factories).
 * Every write to an audited table must go through here: the audit trigger refuses one without an actor, so nothing
 * changes without saying who did it. The setting is local to the transaction, so it never leaks to the next query on
 * the same connection.
 */
export function audited<T>(
	actor: string,
	write: (tx: Transaction) => Promise<T>,
): Promise<T> {
	return db.transaction(async (tx) => {
		await tx.execute(sql`select set_config('app.actor', ${actor}, true)`);
		return write(tx);
	});
}
