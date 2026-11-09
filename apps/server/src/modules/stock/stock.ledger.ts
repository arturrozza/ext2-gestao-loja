import { eq, inArray, sql } from "drizzle-orm";
import type { Transaction } from "../../db/audit";
import { insertedRow } from "../../db/rows";
import { saleItemLots, stockLots, stockMovements } from "../../db/schema";
import { expiryToDate, type ISODate } from "../../lib/dates";
import { stockBalances } from "./stock.queries";
import {
	type AdjustmentPlan,
	type CanceledEntry,
	type CostCorrectionPlan,
	type PlannedEntry,
	planEntries,
	planPurchaseCancellation,
	planSaleReturns,
	type SaleExitPlan,
	type SaleReturnLine,
} from "./stock.rules";

/*
 * The stock ledger (docs/product/estoque.md): the one place that writes lots and movements. The caller locks the
 * products first (`lockProducts`), so the balances read here can't change before the write.
 */

/** Who writes and where: every lot and movement carries the store, and every movement its author. */
export type LedgerScope = { storeId: string; userId: string };

/** Units coming in from a purchase line: one lot and one `purchase` movement. */
export type StockEntry = PlannedEntry & {
	/** First day of the expiry month, or null. */
	expiry: ISODate | null;
	purchaseItemId: string;
};

/**
 * Records entries in order: each one becomes a lot and a movement, and two entries of the same product chain (the
 * second starts from the balance the first left). If a product's stock would pass what a movement holds, nothing is
 * written and the error `overflow` builds for that entry's index is thrown.
 */
export async function recordEntries(
	tx: Transaction,
	scope: LedgerScope,
	entries: StockEntry[],
	overflow: (index: number) => unknown,
): Promise<void> {
	const ids = [...new Set(entries.map((entry) => entry.productId))];
	const plan = planEntries(
		await stockBalances(tx, scope.storeId, ids),
		entries,
	);
	if ("overflowAt" in plan) throw overflow(plan.overflowAt);
	const { storeId, userId } = scope;
	const lots = await tx
		.insert(stockLots)
		.values(
			entries.map(({ productId, purchaseItemId, expiry, quantity }) => ({
				storeId,
				productId,
				purchaseItemId,
				expiry,
				quantity,
			})),
		)
		.returning({ id: stockLots.id, purchaseItemId: stockLots.purchaseItemId });
	const lotByItem = new Map(lots.map((lot) => [lot.purchaseItemId, lot.id]));
	const lotOf = (purchaseItemId: string) => {
		const id = lotByItem.get(purchaseItemId);
		if (!id) throw new Error(`no lot for purchase item ${purchaseItemId}`);
		return id;
	};
	// One statement, rows in the order of the entries: `seq` follows that order.
	await tx.insert(stockMovements).values(
		plan.movements.map((movement) => ({
			storeId,
			userId,
			productId: movement.productId,
			type: "purchase" as const,
			quantity: movement.quantity,
			unitCost: movement.unitCost,
			valueChange: movement.valueChange,
			stockAfter: movement.stockAfter,
			averageCostAfter: movement.averageCostAfter,
			lotId: lotOf(movement.purchaseItemId),
			purchaseItemId: movement.purchaseItemId,
		})),
	);
}

/** The units in each of these lots now. */
async function lotQuantities(
	tx: Transaction,
	lotIds: string[],
): Promise<Map<string, number>> {
	const rows = await tx
		.select({ id: stockLots.id, quantity: stockLots.quantity })
		.from(stockLots)
		.where(inArray(stockLots.id, lotIds));
	return new Map(rows.map((row) => [row.id, row.quantity]));
}

/**
 * Records the cancellation of a purchase (`planPurchaseCancellation`): each line's lot goes back to zero and one
 * `purchase_canceled` movement per line points at its line and lot. If a unit of some line already left its lot,
 * nothing is written and the error `unitsGone` builds is thrown (like `overflow` in `recordEntries`).
 */
export async function recordPurchaseCancellation(
	tx: Transaction,
	{ storeId, userId }: LedgerScope,
	lines: CanceledEntry[],
	unitsGone: () => unknown,
): Promise<void> {
	const ids = [...new Set(lines.map((line) => line.productId))];
	const plan = planPurchaseCancellation(
		await stockBalances(tx, storeId, ids),
		await lotQuantities(
			tx,
			lines.map((line) => line.lotId),
		),
		lines,
	);
	if (!plan) throw unitsGone();
	await takeFromLots(
		tx,
		plan.map(({ lotId, quantity }) => ({ lotId, units: quantity })),
	);
	// One statement, rows in the order of the lines: `seq` follows that order.
	await tx.insert(stockMovements).values(
		plan.map(({ productId, purchaseItemId, lotId, movement }) => ({
			storeId,
			userId,
			productId,
			type: "purchase_canceled" as const,
			...movement,
			lotId,
			purchaseItemId,
		})),
	);
}

/**
 * Units leaving their lots (`units` below zero: an adjustment going down, a sale, a canceled purchase) or coming back
 * to them (a canceled sale). The lot's check keeps it from going below zero.
 */
async function changeLots(
	tx: Transaction,
	changes: { lotId: string; units: number }[],
): Promise<void> {
	for (const change of changes) {
		await tx
			.update(stockLots)
			.set({ quantity: sql`${stockLots.quantity} + ${change.units}` })
			.where(eq(stockLots.id, change.lotId));
	}
}

/** Units leaving their lots: `changeLots` with each take below zero. */
const takeFromLots = (
	tx: Transaction,
	takes: { lotId: string; units: number }[],
) =>
	changeLots(
		tx,
		takes.map(({ lotId, units }) => ({ lotId, units: -units })),
	);

/**
 * Records an adjustment (`planAdjustment`): units leave their lots, or come in as a new lot without a purchase, and
 * one `adjustment` movement keeps the reason. It points at the new lot going up; going down the units may leave more
 * than one lot, which the audit log of `stock_lots` keeps.
 */
export async function recordAdjustment(
	tx: Transaction,
	{ storeId, userId }: LedgerScope,
	productId: string,
	{ movement, reason, note, takes, newLot }: AdjustmentPlan,
): Promise<void> {
	await takeFromLots(tx, takes);
	const added =
		newLot &&
		insertedRow(
			await tx
				.insert(stockLots)
				.values({
					storeId,
					productId,
					expiry: newLot.expiry && expiryToDate(newLot.expiry),
					quantity: newLot.quantity,
				})
				.returning({ id: stockLots.id }),
		);
	await tx.insert(stockMovements).values({
		storeId,
		userId,
		productId,
		type: "adjustment",
		...movement,
		reason,
		note,
		lotId: added?.id ?? null,
	});
}

/** Records a cost correction (`planCostCorrection`): no unit moves, only the value of the stock. */
export async function recordCostCorrection(
	tx: Transaction,
	{ storeId, userId }: LedgerScope,
	productId: string,
	{ movement, note }: CostCorrectionPlan,
): Promise<void> {
	await tx.insert(stockMovements).values({
		storeId,
		userId,
		productId,
		type: "cost_correction",
		...movement,
		note,
	});
}

/** Units leaving with a sale line (`planSaleExit`). */
export type SaleExit = {
	productId: string;
	saleItemId: string;
	plan: SaleExitPlan;
};

/**
 * Records the exits of a sale: the units leave their lots, `sale_item_lots` keeps where each line took them from (the
 * cancellation gives them back there), and one `sale` movement per line points at its line.
 */
export async function recordSaleExits(
	tx: Transaction,
	{ storeId, userId }: LedgerScope,
	exits: SaleExit[],
): Promise<void> {
	const takes = exits.flatMap(({ saleItemId, plan }) =>
		plan.takes.map((take) => ({ saleItemId, ...take })),
	);
	await takeFromLots(tx, takes);
	await tx.insert(saleItemLots).values(
		takes.map(({ saleItemId, lotId, units }) => ({
			storeId,
			saleItemId,
			lotId,
			quantity: units,
		})),
	);
	// One statement, rows in the order of the lines: `seq` follows that order.
	await tx.insert(stockMovements).values(
		exits.map(({ productId, saleItemId, plan }) => ({
			storeId,
			userId,
			productId,
			type: "sale" as const,
			...plan.movement,
			saleItemId,
		})),
	);
}

/** A canceled sale line with the lots its units left (`sale_item_lots`), where they go back. */
export type SaleReturn = SaleReturnLine & {
	saleItemId: string;
	lots: { lotId: string; units: number }[];
};

/**
 * Records the cancellation of a sale (`planSaleReturns`): the units go back to the lots they left, whatever their
 * expiry now, and one `sale_canceled` movement per line points at its line. If a product's stock would pass what a
 * movement holds, nothing is written and the error `overflow` builds is thrown.
 */
export async function recordSaleReturns(
	tx: Transaction,
	{ storeId, userId }: LedgerScope,
	lines: SaleReturn[],
	overflow: () => unknown,
): Promise<void> {
	for (const line of lines) {
		const units = line.lots.reduce((sum, lot) => sum + lot.units, 0);
		if (units !== line.quantity) {
			throw new Error(`sale item ${line.saleItemId} left ${units} units`);
		}
	}
	const ids = [...new Set(lines.map((line) => line.productId))];
	const plan = planSaleReturns(await stockBalances(tx, storeId, ids), lines);
	if (!plan) throw overflow();
	await changeLots(
		tx,
		lines.flatMap((line) => line.lots),
	);
	// One statement, rows in the order of the lines: `seq` follows that order.
	await tx.insert(stockMovements).values(
		plan.map(({ productId, saleItemId, movement }) => ({
			storeId,
			userId,
			productId,
			type: "sale_canceled" as const,
			...movement,
			saleItemId,
		})),
	);
}
