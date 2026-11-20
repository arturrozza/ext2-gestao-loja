import { and, asc, eq, gt, inArray, type SQL, sql } from "drizzle-orm";
import type { Executor } from "../../db/audit";
import { products, stockLots, stockMovements, stores } from "../../db/schema";
import {
	type ExpiryMonth,
	expiryToDate,
	type ISODate,
	monthOf,
} from "../../lib/dates";
import type {
	OpenLot,
	SellableLot,
	StockBalance,
	StockState,
} from "./stock.rules";

/*
 * A product's stock, read from the ledger (docs/architecture.md): its quantity is the sum of its lots and its value the
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
 * A lot not expired yet whose month ends within the warning days (alertas.md, RN-ALE-01): the day after its
 * last day comes by `today + days + 1`.
 */
const lotNearExpiry = (today: ISODate): SQL =>
	sql`(not ${lotExpired(today)} and ${stockLots.expiry} + interval '1 month' <= ${today}::date + ${warningDays()} + 1)`;

/** A lot that can be sold on `today`: one without expiry or within it (the app's `sellableStock` and what a sale takes). */
const lotSellable = (today: ISODate): SQL =>
	sql`not coalesce(${lotExpired(today)}, false)`;

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
	sql`(select coalesce(sum(${stockLots.quantity}), 0) from ${stockLots} where ${stockLots.productId} = ${products.id} and ${lotSellable(today)})`.mapWith(
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
			return sql`(${stockQuantity()} = 0 and ${products.minStock} is not null)`;
		case "near_expiry":
			return hasLot(lotNearExpiry(today));
		case "expired":
			return hasLot(lotExpired(today));
	}
}

/** Units of one lot, as the product screen lists them under its expiry (estoque.md, RN-EST-27). */
export type LotBalance = {
	id: string;
	lotCode: string | null;
	manufacturedOn: ExpiryMonth | null;
	quantity: number;
};

/** Units of a product with the same expiry (`null`: none), with the lots they come from. */
export type ExpiryBalance = {
	expiry: ExpiryMonth | null;
	quantity: number;
	expired: boolean;
	nearExpiry: boolean;
	/** In the order a sale takes them. */
	lots: LotBalance[];
};

/**
 * A product's units by expiry on `today`, soonest first and those without expiry last, each with its lots in the order
 * a sale takes them (estoque.md, RN-EST-12): the oldest manufacture first, lots without it after the others.
 */
export async function stockByExpiry(
	executor: Executor,
	productId: string,
	today: ISODate,
): Promise<ExpiryBalance[]> {
	const rows = await executor
		.select({
			id: stockLots.id,
			expiry: stockLots.expiry,
			lotCode: stockLots.lotCode,
			manufacturedOn: stockLots.manufacturedOn,
			quantity: stockLots.quantity,
			expired: sql`coalesce(${lotExpired(today)}, false)`.mapWith(Boolean),
			nearExpiry: sql`coalesce(${lotNearExpiry(today)}, false)`.mapWith(
				Boolean,
			),
		})
		.from(stockLots)
		.where(and(eq(stockLots.productId, productId), gt(stockLots.quantity, 0)))
		.orderBy(...EXIT_ORDER); // Postgres puts nulls last going up.
	const byExpiry = new Map<string | null, ExpiryBalance>();
	for (const row of rows) {
		const expiry = row.expiry && monthOf(row.expiry);
		const group = byExpiry.get(expiry) ?? {
			expiry,
			quantity: 0,
			expired: row.expired,
			nearExpiry: row.nearExpiry,
			lots: [],
		};
		group.quantity += row.quantity;
		group.lots.push({
			id: row.id,
			lotCode: row.lotCode,
			manufacturedOn: row.manufacturedOn && monthOf(row.manufacturedOn),
			quantity: row.quantity,
		});
		byExpiry.set(expiry, group);
	}
	return [...byExpiry.values()];
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

/**
 * The order a sale takes lots in (estoque.md, RN-EST-12): soonest expiry first and those without expiry last, then the
 * oldest manufacture first and those without it last, then the one that came in first. Postgres puts nulls last going
 * up, which is what the first two want.
 */
const EXIT_ORDER = [
	asc(stockLots.expiry),
	asc(stockLots.manufacturedOn),
	asc(stockLots.createdAt),
	asc(stockLots.id),
] as const;

/**
 * The lots of these products a sale can take from on `today`, by product, in the order it takes them (`EXIT_ORDER`).
 * Expired lots never sell.
 */
export async function sellableLots(
	executor: Executor,
	storeId: string,
	productIds: string[],
	today: ISODate,
): Promise<Map<string, (SellableLot & { productId: string })[]>> {
	const rows = await executor
		.select({
			productId: stockLots.productId,
			id: stockLots.id,
			quantity: stockLots.quantity,
		})
		.from(stockLots)
		.where(
			and(
				eq(stockLots.storeId, storeId),
				inArray(stockLots.productId, productIds),
				gt(stockLots.quantity, 0),
				lotSellable(today),
			),
		)
		.orderBy(...EXIT_ORDER);
	return Map.groupBy(rows, (row) => row.productId);
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
