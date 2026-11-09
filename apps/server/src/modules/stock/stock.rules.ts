import type { stockAdjustmentReason } from "../../db/schema";
import type { ExpiryMonth } from "../../lib/dates";
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

/**
 * Value that leaves with `units` (docs/decisions.md): the average cost rounded to the cent × units, and the whole
 * value when the stock goes to zero. Never more than the value left (4 units worth 2 cents round to 1 cent each: 3
 * of them can't take 3 cents).
 */
export function exitValue(balance: StockBalance, units: number): number {
	if (units >= balance.quantity) return balance.value;
	return Math.min(averageCost(balance) * units, balance.value);
}

/** Largest `integer` column: the most units (and cents, `MAX_CENTS`) one movement holds. */
export const MAX_STOCK_UNITS = 2_147_483_647;

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
 * The stock states the product list filters by (estoque.md): has sellable units, low, out, near expiry and expired.
 * `stockStateFilter` (stock.queries.ts) says the same in SQL.
 */
export const STOCK_STATES = [
	"in_stock",
	"low",
	"out",
	"near_expiry",
	"expired",
] as const;

export type StockState = (typeof STOCK_STATES)[number];

/** The quantity states of a product (estoque.md). */
export type QuantityFlags = { lowStock: boolean; outOfStock: boolean };

/** Whether some units expire within the store's warning days, and whether some already expired (read in SQL). */
export type ExpiryFlags = { nearExpiry: boolean; expired: boolean };

/**
 * Low: at or below the minimum, while there's some (none at all is "out", not also low). Without a minimum, never low.
 * Both count every unit, expired ones included until discarded (estoque.md): a product whose only units are expired
 * is low by its minimum, never "in_stock" (nothing sellable).
 */
export function stockFlags(
	quantity: number,
	minStock: number | null,
): QuantityFlags {
	return {
		lowStock: quantity > 0 && minStock !== null && quantity <= minStock,
		outOfStock: quantity === 0,
	};
}

/** A product's stock as read from the ledger (`stockColumns`). */
export type StockFigures = ExpiryFlags & {
	stock: number;
	sellableStock: number;
	stockValue: number;
};

/** What a product shows of its stock: the figures, the average cost and the states. */
export function stockSummary(
	{ nearExpiry, expired, ...figures }: StockFigures,
	minStock: number | null,
) {
	return {
		...figures,
		averageCost: averageCost({
			quantity: figures.stock,
			value: figures.stockValue,
		}),
		flags: { ...stockFlags(figures.stock, minStock), nearExpiry, expired },
	};
}

/** Why an adjustment changed the quantity (estoque.md, "Ajuste"). */
export type AdjustmentReason =
	(typeof stockAdjustmentReason.enumValues)[number];

/** Units still in a lot (oldest lot first where a list of them is read). */
export type OpenLot = {
	id: string;
	expiry: ExpiryMonth | null;
	quantity: number;
	expired: boolean;
};

/** A movement of a stock correction as planned: the change and the stock right after it. */
export type MovementPlan = PlannedMovement & {
	quantity: number;
	unitCost: number;
};

/** An adjustment as planned (`planAdjustment`), for the ledger to record. */
export type AdjustmentPlan = {
	movement: MovementPlan;
	reason: AdjustmentReason;
	note: string | null;
	/** Units taken from each lot, going down. */
	takes: { lotId: string; units: number }[];
	/** The lot of the new units, going up. */
	newLot: { expiry: ExpiryMonth | null; quantity: number } | null;
};

/** A cost correction as planned (`planCostCorrection`): the movement and why. */
export type CostCorrectionPlan = { movement: MovementPlan; note: string };
