import { and, eq, gte, type SQL, sql } from "drizzle-orm";
import { customers, resellers, saleCosts, sales } from "../../db/schema";
import type { ISODate } from "../../lib/dates";
import { active } from "./sales.queries";

/*
 * Sales totals of a customer or reseller, as columns of a select from `customers` or `resellers` (correlated to the
 * row's id, like the stock columns of a product). Canceled sales never count (clientes.md, revendedoras.md).
 */

/** An aggregate of the sales that meet `where`, as a number column (zero without any). */
const salesAggregate = (aggregate: SQL, where: SQL | undefined) =>
	sql`(select coalesce(${aggregate}, 0) from ${sales} where ${where})`.mapWith(
		Number,
	);

/** A reseller's sales, revenue and commissions from `since` on (`periodStart`); every sale when null. */
export function resellerSalesColumns(since: ISODate | null) {
	const hers = and(
		eq(sales.resellerId, resellers.id),
		active,
		since ? gte(sales.date, since) : undefined,
	);
	return {
		salesCount: salesAggregate(sql`count(*)`, hers),
		salesTotal: salesAggregate(sql`sum(${sales.revenue})`, hers),
		commissionTotal:
			sql`(select coalesce(sum(${saleCosts.amount}), 0) from ${saleCosts} where ${and(
				eq(saleCosts.kind, "commission"),
				sql`${saleCosts.saleId} in (select ${sales.id} from ${sales} where ${hers})`,
			)})`.mapWith(Number),
	};
}

/** What a customer bought: how many sales, how much, and the day of the last one (null before the first). */
export function customerSalesColumns() {
	const theirs = and(eq(sales.customerId, customers.id), active);
	return {
		purchasesCount: salesAggregate(sql`count(*)`, theirs),
		totalSpent: salesAggregate(sql`sum(${sales.revenue})`, theirs),
		// As text: "2026-11-08", like the `date` columns Drizzle reads.
		lastPurchaseAt: sql<
			string | null
		>`(select max(${sales.date})::text from ${sales} where ${theirs})`,
	};
}
