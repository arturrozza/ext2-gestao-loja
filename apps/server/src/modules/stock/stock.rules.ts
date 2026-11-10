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
 * Value that leaves with `units` at `unitCost` each (docs/decisions.md): the average cost rounded to the cent for a
 * sale or an adjustment, its own cost for a canceled purchase line. The whole value leaves
 * when the stock goes to zero, and never more than the value left (4 units worth 2 cents round to 1 cent each: 3 of
 * them can't take 3 cents), so the stock is never worth less than zero.
 */
export function exitValue(
	balance: StockBalance,
	units: number,
	unitCost: number,
): number {
	if (units >= balance.quantity) return balance.value;
	return Math.min(unitCost * units, balance.value);
}

/** The movement of `units` leaving at `unitCost` each (`exitValue`), with the stock right after it. */
function exitMovement(
	balance: StockBalance,
	units: number,
	unitCost: number,
): MovementPlan {
	// `0 -`, not `-`: an exit worth nothing changes the value by 0, not -0.
	const valueChange = 0 - exitValue(balance, units, unitCost);
	const after = {
		quantity: balance.quantity - units,
		value: balance.value + valueChange,
	};
	return {
		quantity: -units,
		unitCost,
		valueChange,
		stockAfter: after.quantity,
		averageCostAfter: averageCost(after),
	};
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
 * Low: at or below the minimum, while there's some (none at all is "out", not also low). Without a minimum, never low
 * nor out: the minimum is how the store says it follows a product, so a product registered and never bought isn't
 * an alert (alertas.md).
 * Both count every unit, expired ones included until discarded (estoque.md): a product whose only units are expired
 * is low by its minimum, never "in_stock" (nothing sellable).
 */
export function stockFlags(
	quantity: number,
	minStock: number | null,
): QuantityFlags {
	return {
		lowStock: quantity > 0 && minStock !== null && quantity <= minStock,
		outOfStock: quantity === 0 && minStock !== null,
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

/** A lot a sale can take from: one not expired, in the order sales take them (`sellableLots`). */
export type SellableLot = { id: string; quantity: number };

/** A sale line's exit as planned (`planSaleExit`): the units each lot gives and the movement that takes them. */
export type SaleExitPlan = {
	takes: { lotId: string; units: number }[];
	movement: MovementPlan;
};

/**
 * `units` leaving with a sale (estoque.md, "Saída na venda"): from the lots in the order given (soonest expiry first,
 * then the oldest), never an expired one, at the average cost (`exitValue`). `null` when the lots don't have them all.
 */
export function planSaleExit(
	balance: StockBalance,
	lots: SellableLot[],
	units: number,
): SaleExitPlan | null {
	const takes: SaleExitPlan["takes"] = [];
	let left = units;
	for (const lot of lots) {
		if (left === 0) break;
		const taken = Math.min(lot.quantity, left);
		takes.push({ lotId: lot.id, units: taken });
		left -= taken;
	}
	if (left > 0) return null;
	return {
		takes,
		movement: exitMovement(balance, units, averageCost(balance)),
	};
}

/** A purchase line being canceled: the units and cost it brought, and the lot it brought them in. */
export type CanceledEntry = PlannedEntry & {
	purchaseItemId: string;
	lotId: string;
};

/**
 * The movements that undo these purchase lines (compras.md, "Cancelamento"), applied in order over the current
 * balances; two lines of the same product chain. Each takes back exactly the value it brought, so a purchase with only
 * other purchases after it leaves the stock as if it never existed; a sale or a cost correction in between already
 * moved value at the average cost, so `exitValue` keeps the stock from going below zero (docs/decisions.md). `null`
 * when a unit of some line already left its lot (`lotUnits`: the units in each lot now), sold, adjusted or discarded:
 * it can't be canceled then.
 */
export function planPurchaseCancellation<T extends CanceledEntry>(
	balances: ReadonlyMap<string, StockBalance>,
	lotUnits: ReadonlyMap<string, number>,
	entries: T[],
): (T & { movement: MovementPlan })[] | null {
	const gone = entries.some(
		(entry) => (lotUnits.get(entry.lotId) ?? 0) < entry.quantity,
	);
	if (gone) return null;
	const running = new Map(balances);
	return entries.map((entry) => {
		const balance = running.get(entry.productId) ?? EMPTY_STOCK;
		const movement = exitMovement(balance, entry.quantity, entry.unitCost);
		running.set(entry.productId, {
			quantity: movement.stockAfter,
			value: balance.value + movement.valueChange,
		});
		return { ...entry, movement };
	});
}

/**
 * `units` of a canceled sale line coming back (vendas.md, "Cancelamento"), without changing the average cost: they
 * bring their share of the stock's value (no `integer` overflow: a line holds at most 100.000 units). Without stock
 * there's no average to keep, so they bring back what the sale took, `cost` (in cents). `null` when the stock would
 * pass what a movement holds.
 */
function returnMovement(
	balance: StockBalance,
	units: number,
	cost: number,
): MovementPlan | null {
	const valueChange =
		balance.quantity > 0
			? divideRounded(balance.value * units, balance.quantity)
			: cost;
	const after = {
		quantity: balance.quantity + units,
		value: balance.value + valueChange,
	};
	if (!fitsStock(after)) return null;
	return {
		quantity: units,
		unitCost: divideRounded(valueChange, units),
		valueChange,
		stockAfter: after.quantity,
		averageCostAfter: averageCost(after),
	};
}

/** A canceled sale line: its units and what they cost the sale (in cents). */
export type SaleReturnLine = {
	productId: string;
	quantity: number;
	cost: number;
};

/**
 * The movements that give a canceled sale's units back (`returnMovement`), applied in order over the current
 * balances; two lines of the same product chain. `null` when a product's stock would pass what a movement holds.
 */
export function planSaleReturns<T extends SaleReturnLine>(
	balances: ReadonlyMap<string, StockBalance>,
	lines: T[],
): (T & { movement: MovementPlan })[] | null {
	const running = new Map(balances);
	const planned: (T & { movement: MovementPlan })[] = [];
	for (const line of lines) {
		const balance = running.get(line.productId) ?? EMPTY_STOCK;
		const movement = returnMovement(balance, line.quantity, line.cost);
		if (!movement) return null;
		running.set(line.productId, {
			quantity: movement.stockAfter,
			value: balance.value + movement.valueChange,
		});
		planned.push({ ...line, movement });
	}
	return planned;
}
