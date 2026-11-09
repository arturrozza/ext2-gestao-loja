import { eq, sql } from "drizzle-orm";
import type { Transaction } from "../../db/audit";
import { insertedRow } from "../../db/rows";
import { saleItemLots, stockLots, stockMovements } from "../../db/schema";
import { expiryToDate, type ISODate } from "../../lib/dates";
import { stockBalances } from "./stock.queries";
import {
	type AdjustmentPlan,
	type CostCorrectionPlan,
	type PlannedEntry,
	planEntries,
	type SaleExitPlan,
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

/** Units leaving their lots (an adjustment going down, or a sale). The lot's check keeps it from going below zero. */
async function takeFromLots(
	tx: Transaction,
	takes: { lotId: string; units: number }[],
): Promise<void> {
	for (const take of takes) {
		await tx
			.update(stockLots)
			.set({ quantity: sql`${stockLots.quantity} - ${take.units}` })
			.where(eq(stockLots.id, take.lotId));
	}
}

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
