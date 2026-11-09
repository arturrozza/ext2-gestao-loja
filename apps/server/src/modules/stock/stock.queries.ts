import { and, asc, eq, gt, inArray, type SQL, sql } from "drizzle-orm";
import type { Executor } from "../../db/audit";
import { products, stockLots, stockMovements, stores } from "../../db/schema";
import {
	type ExpiryMonth,
	expiryToDate,
	type ISODate,
	monthOf,
} from "../../lib/dates";
import type { OpenLot, StockBalance, StockState } from "./stock.rules";

/*
 * A product's stock, read from the ledger (docs/decisions.md): its quantity is the sum of its lots and its value the
 * sum of its movements. These are correlated to `products.id`, so they go in any select from `products`.
 */

/**
 * A lot expired on `today`: a product counts as expired after the last day of its expiry month, so a lot of this
 * month still sells. Lots without expiry never expire (`null < x` is not true).
 */
const lotExpired = (today: ISODate): SQL =>
	sql`${stockLots.expiry} < ${expiryToDate(monthOf(today))}`;

/** The "antecedência de vencimento" of the lot's store (alertas.md), in days. */
const warningDays = (): SQL =>
	sql`(select ${stores.expiryWarningDays} from ${stores} where ${stores.id} = ${stockLots.storeId})`;

/**
 * A lot not expired yet whose month ends within the warning days (alertas.md, "Perto de vencer"): the day after its
 * last day comes by `today + days + 1`.
 */
const lotNearExpiry = (today: ISODate): SQL =>
	sql`(not ${lotExpired(today)} and ${stockLots.expiry} + interval '1 month' <= ${today}::date + ${warningDays()} + 1)`;

/** The product has units in a lot that meets `condition`. */
const hasLot = (condition: SQL): SQL<boolean> =>
	sql`exists (select 1 from ${stockLots} where ${stockLots.productId} = ${products.id} and ${stockLots.quantity} > 0 and ${condition})`.mapWith(
		Boolean,
	);

/** Units in stock, expired ones included until they're discarded (estoque.md). */
const stockQuantity = (): SQL<number> =>
	sql`(select coalesce(sum(${stockLots.quantity}), 0) from ${stockLots} where ${stockLots.productId} = ${products.id})`.mapWith(
		Number,
	);

/** Units that can be sold on `today`: those without expiry or within it. */
const sellableQuantity = (today: ISODate): SQL<number> =>
	sql`(select coalesce(sum(${stockLots.quantity}), 0) from ${stockLots} where ${stockLots.productId} = ${products.id} and not coalesce(${lotExpired(today)}, false))`.mapWith(
		Number,
	);

/** Value of the stock in cents: what the movements added and took. */
const stockValue = (): SQL<number> =>
	sql`(select coalesce(sum(${stockMovements.valueChange}), 0) from ${stockMovements} where ${stockMovements.productId} = ${products.id})`.mapWith(
		Number,
	);

/** The stock columns of a select from `products` (`StockFigures`), on `today` (it decides what's expired). */
export const stockColumns = (today: ISODate) => ({
	stock: stockQuantity(),
	sellableStock: sellableQuantity(today),
	stockValue: stockValue(),
	nearExpiry: hasLot(lotNearExpiry(today)),
	expired: hasLot(lotExpired(today)),
});

/** Where clause of a stock state, as `stockFlags` (stock.rules.ts) and the columns above define it. */
export function stockStateFilter(state: StockState, today: ISODate): SQL {
	switch (state) {
		case "in_stock":
			return sql`${sellableQuantity(today)} > 0`;
		case "low":
			return sql`(${stockQuantity()} > 0 and ${stockQuantity()} <= ${products.minStock})`;
		case "out":
			return sql`${stockQuantity()} = 0`;
		case "near_expiry":
			return hasLot(lotNearExpiry(today));
		case "expired":
			return hasLot(lotExpired(today));
	}
}

/** Units of a product with the same expiry (`null`: none), as the product screen shows them. */
export type ExpiryBalance = {
	expiry: ExpiryMonth | null;
	quantity: number;
	expired: boolean;
	nearExpiry: boolean;
};

/** A product's units by expiry on `today`, soonest first and those without expiry last. Lots stay hidden. */
export async function stockByExpiry(
	executor: Executor,
	productId: string,
	today: ISODate,
): Promise<ExpiryBalance[]> {
	const rows = await executor
		.select({
			expiry: stockLots.expiry,
			quantity: sql`sum(${stockLots.quantity})`.mapWith(Number),
			expired: sql`coalesce(bool_or(${lotExpired(today)}), false)`.mapWith(
				Boolean,
			),
			nearExpiry:
				sql`coalesce(bool_or(${lotNearExpiry(today)}), false)`.mapWith(Boolean),
		})
		.from(stockLots)
		.where(
			and(eq(stockLots.productId, productId), sql`${stockLots.quantity} > 0`),
		)
		.groupBy(stockLots.expiry)
		.orderBy(asc(stockLots.expiry)); // Postgres puts nulls last going up.
	return rows.map((row) => ({
		...row,
		expiry: row.expiry && monthOf(row.expiry),
	}));
}

/**
 * A product's lots that still have units on `today`, oldest first (where an adjustment takes units from). Lots of one
 * purchase share `createdAt`; between them the id decides, any order being as old as the other.
 */
export async function openLots(
	executor: Executor,
	productId: string,
	today: ISODate,
): Promise<OpenLot[]> {
	const rows = await executor
		.select({
			id: stockLots.id,
			expiry: stockLots.expiry,
			quantity: stockLots.quantity,
			expired: sql`coalesce(${lotExpired(today)}, false)`.mapWith(Boolean),
		})
		.from(stockLots)
		.where(and(eq(stockLots.productId, productId), gt(stockLots.quantity, 0)))
		.orderBy(asc(stockLots.createdAt), asc(stockLots.id));
	return rows.map((row) => ({
		...row,
		expiry: row.expiry && monthOf(row.expiry),
	}));
}

/** Value in cents of all the store's stock: archived products included, their units are still there (estoque.md). */
export async function storeStockValue(
	executor: Executor,
	storeId: string,
): Promise<number> {
	const [row] = await executor
		.select({
			value: sql`coalesce(sum(${stockMovements.valueChange}), 0)`.mapWith(
				Number,
			),
		})
		.from(stockMovements)
		.where(eq(stockMovements.storeId, storeId));
	return row?.value ?? 0;
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
