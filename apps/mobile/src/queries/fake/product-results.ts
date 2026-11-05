/** FAKE BACKEND (MUN-21): per-product results of sales, shared by reports and alerts. */
import type { ISODate } from "@/lib/dates";
import { db, type SaleRow } from "./fake-db";

export type ProductResult = {
	productId: string;
	quantity: number;
	revenueCents: number;
	profitCents: number;
};

/**
 * A sale's discount, surcharge and costs are split among its items in proportion to each item's value. PROVISIONAL:
 * relatorios.md leaves open how to split costs across products. The sale-level numbers don't depend on this.
 */
function itemResults(sale: SaleRow): ProductResult[] {
	const gross = sale.items.reduce(
		(sum, item) => sum + item.quantity * item.unitPriceCents,
		0,
	);
	return sale.items.map((item) => {
		const value = item.quantity * item.unitPriceCents;
		const share = gross > 0 ? value / gross : 0;
		const revenueCents = Math.round(sale.revenueCents * share);
		return {
			productId: item.productId,
			quantity: item.quantity,
			revenueCents,
			profitCents:
				revenueCents -
				item.quantity * item.unitCostCents -
				Math.round(sale.saleCostsCents * share),
		};
	});
}

/** Active sales with a date in the range (the period uses the sale date; canceled ones never count). */
export function salesInRange(
	from: ISODate | null,
	to: ISODate | null,
): SaleRow[] {
	return db.current.sales.filter(
		(sale) =>
			!sale.canceledAt &&
			(from === null || sale.date >= from) &&
			(to === null || sale.date <= to),
	);
}

/** Revenue, profit and margin of some sales. */
export function saleTotals(sales: SaleRow[]) {
	const revenueCents = sales.reduce((sum, sale) => sum + sale.revenueCents, 0);
	const profitCents = sales.reduce((sum, sale) => sum + sale.profitCents, 0);
	return {
		count: sales.length,
		revenueCents,
		profitCents,
		margin: revenueCents > 0 ? profitCents / revenueCents : null,
	};
}

/** Results per product over some sales. */
export function resultsByProduct(sales: SaleRow[]): Map<string, ProductResult> {
	const results = new Map<string, ProductResult>();
	for (const item of sales.flatMap(itemResults)) {
		const current = results.get(item.productId);
		results.set(item.productId, {
			productId: item.productId,
			quantity: (current?.quantity ?? 0) + item.quantity,
			revenueCents: (current?.revenueCents ?? 0) + item.revenueCents,
			profitCents: (current?.profitCents ?? 0) + item.profitCents,
		});
	}
	return results;
}
