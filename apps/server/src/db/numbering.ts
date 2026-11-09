import { eq, sql } from "drizzle-orm";
import type { Transaction } from "./audit";
import { type purchases, type sales, stores } from "./schema";

/**
 * The next number of the store's purchases or sales ("Compra #12", "Venda #12"). The store row is locked first (after
 * the products, the stock write's lock order), so two entered at once get different numbers; the unique index is the
 * last guard. `NO KEY UPDATE` doesn't block the inserts that only reference the store (products, customers...).
 */
export async function nextNumber(
	tx: Transaction,
	table: typeof purchases | typeof sales,
	storeId: string,
): Promise<number> {
	await tx
		.select({ id: stores.id })
		.from(stores)
		.where(eq(stores.id, storeId))
		.for("no key update");
	const [row] = await tx
		.select({ last: sql`coalesce(max(${table.number}), 0)`.mapWith(Number) })
		.from(table)
		.where(eq(table.storeId, storeId));
	return (row?.last ?? 0) + 1;
}
