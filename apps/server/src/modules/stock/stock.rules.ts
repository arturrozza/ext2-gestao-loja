import { divideRounded, MAX_CENTS } from "../../lib/money";

/**
 * Stock math (docs/product/compras.md, "Custo médio"). A product's stock is a quantity and a value in cents; the
 * average cost is value ÷ quantity, worked out when needed and rounded only for showing. An entry only adds, so no
 * rounding error builds up (R$ 10 in 3 units stays 1000 cents ÷ 3, never 333 × 3; docs/decisions.md).
 */
export type StockBalance = { quantity: number; value: number };

export const EMPTY_STOCK: StockBalance = { quantity: 0, value: 0 };

/** Average cost in cents, rounded to the cent; zero without stock. */
export function averageCost({ quantity, value }: StockBalance): number {
	return quantity > 0 ? divideRounded(value, quantity) : 0;
}

/**
 * The stock after an entry of `quantity` units at `unitCost` each: it only adds (10 at R$ 92 + 10 at R$ 100 = 20 units
 * worth R$ 1.920, which `averageCost` turns into R$ 96).
 */
export function afterEntry(
	balance: StockBalance,
	entry: { quantity: number; unitCost: number },
): StockBalance {
	return {
		quantity: balance.quantity + entry.quantity,
		value: balance.value + entry.quantity * entry.unitCost,
	};
}

/** Largest `integer` column: the most units (and cents, `MAX_CENTS`) one movement holds. */
const MAX_STOCK_UNITS = 2_147_483_647;

/** A balance a product can hold: its units and its value each fit an `integer` column, as a movement keeps them. */
export function fitsStock({ quantity, value }: StockBalance): boolean {
	return quantity <= MAX_STOCK_UNITS && value <= MAX_CENTS;
}

/** Units coming in at a unit cost (in cents). */
export type PlannedEntry = {
	productId: string;
	quantity: number;
	unitCost: number;
};

/** What the ledger writes for an entry: the change in value and the stock right after it. */
export type PlannedMovement = {
	valueChange: number;
	stockAfter: number;
	averageCostAfter: number;
};

/**
 * The entries with their movements, applied in order over the current balances; two entries of the same product
 * chain. If a product's stock would pass what a movement holds, the index of the first entry that does it instead.
 */
export function planEntries<T extends PlannedEntry>(
	balances: ReadonlyMap<string, StockBalance>,
	entries: T[],
): { movements: (T & PlannedMovement)[] } | { overflowAt: number } {
	const running = new Map(balances);
	const movements: (T & PlannedMovement)[] = [];
	for (const [index, entry] of entries.entries()) {
		const after = afterEntry(
			running.get(entry.productId) ?? EMPTY_STOCK,
			entry,
		);
		if (!fitsStock(after)) return { overflowAt: index };
		running.set(entry.productId, after);
		movements.push({
			...entry,
			valueChange: entry.quantity * entry.unitCost,
			stockAfter: after.quantity,
			averageCostAfter: averageCost(after),
		});
	}
	return { movements };
}

/**
 * The stock states the product list filters by (estoque.md): has sellable units, low, out. Expiry states come with the
 * stock screen (MUN-13). `stockStateFilter` (stock.queries.ts) says the same in SQL.
 */
export const STOCK_STATES = ["in_stock", "low", "out"] as const;

export type StockState = (typeof STOCK_STATES)[number];

/** The quantity states of a product (estoque.md); expiry states come with the stock screen (MUN-13). */
export type StockFlags = { lowStock: boolean; outOfStock: boolean };

/**
 * Low: at or below the minimum, while there's some (none at all is "out", not also low). Without a minimum, never low.
 * Both count every unit, expired ones included until discarded (estoque.md): a product whose only units are expired
 * is low by its minimum, never "in_stock" (nothing sellable).
 */
export function stockFlags(
	quantity: number,
	minStock: number | null,
): StockFlags {
	return {
		lowStock: quantity > 0 && minStock !== null && quantity <= minStock,
		outOfStock: quantity === 0,
	};
}

/** A product's stock as read from the ledger (`stockColumns`). */
export type StockFigures = {
	stock: number;
	sellableStock: number;
	stockValue: number;
};

/** What a product shows of its stock. */
export type StockSummary = StockFigures & {
	averageCost: number;
	flags: StockFlags;
};

/** What a product shows of its stock: the figures, the average cost and the states. */
export function stockSummary(
	figures: StockFigures,
	minStock: number | null,
): StockSummary {
	return {
		...figures,
		averageCost: averageCost({
			quantity: figures.stock,
			value: figures.stockValue,
		}),
		flags: stockFlags(figures.stock, minStock),
	};
}
