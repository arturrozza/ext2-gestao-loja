import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "../../db";
import {
	categories,
	products,
	resellers,
	saleCosts,
	saleItems,
	sales,
} from "../../db/schema";
import { active } from "../sales/sales.queries";
import type { Range } from "./reports.period";
import type { ReportData } from "./reports.rules";

/** The active sales of the store whose day is in the range (canceled ones never count). */
const inPeriod = (storeId: string, { from, to }: Range) =>
	and(
		eq(sales.storeId, storeId),
		active,
		gte(sales.date, from),
		lte(sales.date, to),
	);

/**
 * What the report is made of, read in one snapshot: a sale canceled while the three reads run can't show in one and not
 * in another. Archived products, categories and resellers are read too: they stay in the periods they sold in
 * (relatorios.md).
 */
export function readReportData(
	storeId: string,
	range: Range,
): Promise<ReportData> {
	const filter = inPeriod(storeId, range);
	return db.transaction(
		async (tx) => ({
			sales: await tx
				.select({
					id: sales.id,
					date: sales.date,
					channel: sales.channel,
					resellerId: sales.resellerId,
					resellerName: resellers.name,
					revenue: sales.revenue,
					profit: sales.profit,
					productsCost: sales.productsCost,
					saleCosts: sales.saleCosts,
				})
				.from(sales)
				.leftJoin(resellers, eq(resellers.id, sales.resellerId))
				.where(filter),
			costs: await tx
				.select({
					saleId: saleCosts.saleId,
					kind: saleCosts.kind,
					amount: saleCosts.amount,
				})
				.from(saleCosts)
				.innerJoin(sales, eq(sales.id, saleCosts.saleId))
				.where(filter),
			items: await tx
				.select({
					saleId: saleItems.saleId,
					productId: saleItems.productId,
					productName: products.name,
					categoryId: products.categoryId,
					categoryName: categories.name,
					quantity: saleItems.quantity,
					unitPrice: saleItems.unitPrice,
					cost: saleItems.cost,
				})
				.from(saleItems)
				.innerJoin(sales, eq(sales.id, saleItems.saleId))
				.innerJoin(products, eq(products.id, saleItems.productId))
				.leftJoin(categories, eq(categories.id, products.categoryId))
				.where(filter)
				.orderBy(asc(saleItems.saleId), asc(saleItems.position)),
		}),
		{ isolationLevel: "repeatable read", accessMode: "read only" },
	);
}
