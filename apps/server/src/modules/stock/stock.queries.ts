import { and, eq, inArray, type SQL, sql } from "drizzle-orm";
import type { Executor } from "../../db/audit";
import { products, stockLots, stockMovements } from "../../db/schema";
import { expiryToDate, type ISODate, monthOf } from "../../lib/dates";
import type { StockBalance, StockState } from "./stock.rules";

/*
 * A product's stock, read from the ledger (docs/decisions.md): its quantity is the sum of its lots and its value the
 * sum of its movements. These are correlated to `products.id`, so they go in any select from `products`.
 */

/** Units in stock, expired ones included until they're discarded (estoque.md). */
const stockQuantity = (): SQL<number> =>
	sql`(select coalesce(sum(${stockLots.quantity}), 0) from ${stockLots} where ${stockLots.productId} = ${products.id})`.mapWith(
		Number,
	);

/**
 * Units that can be sold on `today`: those without expiry or within it. A product counts as expired after the last day
 * of its expiry month, so a lot of this month still sells.
 */
const sellableQuantity = (today: ISODate): SQL<number> =>
	sql`(select coalesce(sum(${stockLots.quantity}), 0) from ${stockLots} where ${stockLots.productId} = ${products.id} and (${stockLots.expiry} is null or ${stockLots.expiry} >= ${expiryToDate(monthOf(today))}))`.mapWith(
		Number,
	);

/** Value of the stock in cents: what the movements added and took. */
const stockValue = (): SQL<number> =>
	sql`(select coalesce(sum(${stockMovements.valueChange}), 0) from ${stockMovements} where ${stockMovements.productId} = ${products.id})`.mapWith(
		Number,
	);

/** The stock columns of a select from `products` (`StockFigures`), with what can be sold on `today`. */
export const stockColumns = (today: ISODate) => ({
	stock: stockQuantity(),
	sellableStock: sellableQuantity(today),
	stockValue: stockValue(),
});

/** Where clause of a stock state, as `stockFlags` (stock.rules.ts) and `sellableQuantity` define it. */
export function stockStateFilter(state: StockState, today: ISODate): SQL {
	switch (state) {
		case "in_stock":
			return sql`${sellableQuantity(today)} > 0`;
		case "low":
			return sql`(${stockQuantity()} > 0 and ${stockQuantity()} <= ${products.minStock})`;
		case "out":
			return sql`${stockQuantity()} = 0`;
	}
}

/** The balance of each of the store's products with these ids (other ids are missing from the map). */
export async function stockBalances(
	executor: Executor,
	storeId: string,
	productIds: string[],
): Promise<Map<string, StockBalance>> {
	const rows = await executor
		.select({
			id: products.id,
			quantity: stockQuantity(),
			value: stockValue(),
		})
		.from(products)
		.where(
			and(eq(products.storeId, storeId), inArray(products.id, productIds)),
		);
	return new Map(rows.map(({ id, ...balance }) => [id, balance]));
}
