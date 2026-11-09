import { and, asc, eq, inArray } from "drizzle-orm";
import type { Transaction } from "../../db/audit";
import { products } from "../../db/schema";

/** What a purchase (or sale) checks of each product it takes, read under the lock. */
export type LockedProduct = {
	id: string;
	name: string;
	hasExpiry: boolean;
	archived: boolean;
};

/**
 * Locks the store's products with these ids for a stock write, so two writes on the same product (a purchase and a
 * sale) queue up and each one reads the balance the other left. Always in id order, so two writes over the same
 * products can't deadlock. Ids of other stores (or unknown) are simply missing from the map.
 *
 * Lock order of a stock write: the products first (here), then the store row when it needs one (the purchase number).
 */
export async function lockProducts(
	tx: Transaction,
	storeId: string,
	ids: string[],
): Promise<Map<string, LockedProduct>> {
	const rows = await tx
		.select({
			id: products.id,
			name: products.name,
			hasExpiry: products.hasExpiry,
			archivedAt: products.archivedAt,
		})
		.from(products)
		.where(and(eq(products.storeId, storeId), inArray(products.id, ids)))
		.orderBy(asc(products.id))
		.for("update");
	return new Map(
		rows.map(({ archivedAt, ...row }) => [
			row.id,
			{ ...row, archived: archivedAt !== null },
		]),
	);
}
