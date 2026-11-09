import type { Transaction } from "../../db/audit";
import { stockLots, stockMovements } from "../../db/schema";
import type { ISODate } from "../../lib/dates";
import { stockBalances } from "./stock.queries";
import { type PlannedEntry, planEntries } from "./stock.rules";

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
