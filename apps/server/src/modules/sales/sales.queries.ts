import {
	and,
	asc,
	count,
	desc,
	eq,
	gt,
	gte,
	inArray,
	isNull,
	lt,
	lte,
	type SQL,
	sql,
} from "drizzle-orm";
import { db } from "../../db";
import type { Executor } from "../../db/audit";
import {
	customers,
	products,
	resellers,
	saleCosts,
	saleItems,
	sales,
	users,
} from "../../db/schema";
import type { ISODate } from "../../lib/dates";
import { httpError } from "../../lib/http-error";
import { nextCursor, PAGE_SIZE } from "../../lib/pagination";
import { photoUrlOf } from "../../lib/photo-storage";
import { previewOf } from "../../lib/preview";
import type { SalesModel } from "./sales.model";
import { type DayTotals, marginOf, periodStart } from "./sales.rules";

/* Sales read back (docs/product/vendas.md): the numbers kept when each was entered, never recomputed. */

export const notFound = () =>
	httpError(404, { code: "sale_not_found", message: "Venda não encontrada." });

type ItemRow = SalesModel["item"] & { saleId: string };

/** The lines of these sales, each sale's in the order they were entered. */
async function findItems(
	executor: Executor,
	saleIds: string[],
): Promise<ItemRow[]> {
	if (saleIds.length === 0) return [];
	const rows = await executor
		.select({
			saleId: saleItems.saleId,
			id: saleItems.id,
			productId: saleItems.productId,
			productName: products.name,
			photoKey: products.photoKey,
			quantity: saleItems.quantity,
			unitPrice: saleItems.unitPrice,
			unitCost: saleItems.unitCost,
		})
		.from(saleItems)
		.innerJoin(products, eq(products.id, saleItems.productId))
		.where(inArray(saleItems.saleId, saleIds))
		.orderBy(asc(saleItems.saleId), asc(saleItems.position));
	return rows.map(({ photoKey, ...row }) => ({
		...row,
		photoUrl: photoUrlOf(photoKey),
		total: row.quantity * row.unitPrice,
	}));
}

/** The costs of a sale, in the order they were entered. */
function findCosts(
	executor: Executor,
	saleId: string,
): Promise<SalesModel["cost"][]> {
	return executor
		.select({
			id: saleCosts.id,
			kind: saleCosts.kind,
			mode: saleCosts.mode,
			value: saleCosts.value,
			label: saleCosts.label,
			amount: saleCosts.amount,
		})
		.from(saleCosts)
		.where(eq(saleCosts.saleId, saleId))
		.orderBy(asc(saleCosts.position));
}

/** Lines by sale. Every sale has lines (one at least), so a sale missing here is a bug, not an empty one. */
function linesOf(rows: ItemRow[]) {
	const bySale = Map.groupBy(rows, (row) => row.saleId);
	return (saleId: string): SalesModel["item"][] => {
		const lines = bySale.get(saleId);
		if (!lines) throw new Error(`sale ${saleId} has no lines`);
		return lines.map(({ saleId: _, ...line }) => line);
	};
}

/** What a sale shows in a list, from its row; the counts and thumbs come from its lines. */
const summaryColumns = {
	id: sales.id,
	number: sales.number,
	date: sales.date,
	createdAt: sales.createdAt,
	channel: sales.channel,
	canceledAt: sales.canceledAt,
	customerName: customers.name,
	resellerName: resellers.name,
	revenue: sales.revenue,
	profit: sales.profit,
};

type SummaryRow = Omit<
	SalesModel["summary"],
	"createdAt" | "status" | "productCount" | "preview"
> & { createdAt: Date; canceledAt: Date | null };

function toSummary(
	row: SummaryRow,
	items: SalesModel["item"][],
): SalesModel["summary"] {
	return {
		id: row.id,
		number: row.number,
		date: row.date,
		createdAt: row.createdAt.toISOString(),
		channel: row.channel,
		status: row.canceledAt ? "canceled" : "active",
		customerName: row.customerName,
		resellerName: row.resellerName,
		revenue: row.revenue,
		profit: row.profit,
		...previewOf(items),
	};
}

/** A sale of the store with its lines and costs; 404 when it isn't the store's. */
export async function findSale(
	executor: Executor,
	storeId: string,
	id: string,
): Promise<SalesModel["detail"]> {
	const [sale] = await executor
		.select({
			...summaryColumns,
			cancelReason: sales.cancelReason,
			customerId: sales.customerId,
			resellerId: sales.resellerId,
			paymentCondition: sales.paymentCondition,
			paymentMethod: sales.paymentMethod,
			discount: sales.discount,
			surcharge: sales.surcharge,
			productsCost: sales.productsCost,
			saleCosts: sales.saleCosts,
			author: users.name,
		})
		.from(sales)
		.innerJoin(users, eq(users.id, sales.userId))
		.leftJoin(customers, eq(customers.id, sales.customerId))
		.leftJoin(resellers, eq(resellers.id, sales.resellerId))
		.where(and(eq(sales.id, id), eq(sales.storeId, storeId)));
	if (!sale) throw notFound();
	const [rows, costs] = await Promise.all([
		findItems(executor, [id]),
		findCosts(executor, id),
	]);
	const items = rows.map(({ saleId: _, ...line }) => line);
	return {
		...toSummary(sale, items),
		items,
		costs,
		discount: sale.discount,
		surcharge: sale.surcharge,
		productsCost: sale.productsCost,
		saleCosts: sale.saleCosts,
		margin: marginOf(sale.profit, sale.revenue),
		paymentCondition: sale.paymentCondition,
		paymentMethod: sale.paymentMethod,
		customerId: sale.customerId,
		resellerId: sale.resellerId,
		author: sale.author,
		canceledAt: sale.canceledAt?.toISOString() ?? null,
		cancelReason: sale.cancelReason,
	};
}

/** Where clause of a sales list: the store's sales that match the filters. */
function listFilter(
	storeId: string,
	query: SalesModel["listQuery"],
	today: ISODate,
): SQL | undefined {
	const since = periodStart(query.period ?? "all", today);
	const channels = query.channels ?? [];
	return and(
		eq(sales.storeId, storeId),
		since ? gte(sales.date, since) : undefined,
		channels.length > 0 ? inArray(sales.channel, channels) : undefined,
		query.result === "profit" ? gt(sales.profit, 0) : undefined,
		query.result === "loss" ? lt(sales.profit, 0) : undefined,
		query.customerId ? eq(sales.customerId, query.customerId) : undefined,
		query.resellerId ? eq(sales.resellerId, query.resellerId) : undefined,
	);
}

/** Only the active sales: canceled ones never count (vendas.md). */
export const active = isNull(sales.canceledAt);

/** How many sales match (canceled ones included, for the pages), and the totals of the active ones, in one scan. */
async function countAndTotals(filter: SQL | undefined) {
	const [row] = await db
		.select({
			total: count(),
			revenue:
				sql`coalesce(sum(${sales.revenue}) filter (where ${active}), 0)`.mapWith(
					Number,
				),
			profit:
				sql`coalesce(sum(${sales.profit}) filter (where ${active}), 0)`.mapWith(
					Number,
				),
			count: sql`count(*) filter (where ${active})`.mapWith(Number),
		})
		.from(sales)
		.where(filter);
	// An aggregate without `group by` always gives one row.
	if (!row) throw new Error("sales aggregate returned no row");
	const { total, ...totals } = row;
	return { total, totals };
}

/**
 * A page of the store's sales that match, newest day first (and the last entered first within a day), canceled ones
 * included and marked, with the totals of every page.
 */
export async function listSales(
	storeId: string,
	query: SalesModel["listQuery"],
	today: ISODate,
): Promise<SalesModel["page"]> {
	const cursor = query.cursor ?? 0;
	const filter = listFilter(storeId, query, today);
	const [rows, { total, totals }] = await Promise.all([
		db
			.select(summaryColumns)
			.from(sales)
			.leftJoin(customers, eq(customers.id, sales.customerId))
			.leftJoin(resellers, eq(resellers.id, sales.resellerId))
			.where(filter)
			.orderBy(desc(sales.date), desc(sales.number))
			.limit(PAGE_SIZE)
			.offset(cursor),
		countAndTotals(filter),
	]);
	// Every line of the page, for the counts and thumbs: at most 30 × 100 rows, like the purchases.
	const lines = linesOf(
		await findItems(
			db,
			rows.map((row) => row.id),
		),
	);
	return {
		items: rows.map((row) => toSummary(row, lines(row.id))),
		nextCursor: nextCursor(cursor, total),
		total,
		totals,
	};
}

/** The store's active sales of each day from `start` to `end` (inclusive), summed; days without sales are missing. */
export function dailyTotals(
	storeId: string,
	start: ISODate,
	end: ISODate,
): Promise<DayTotals[]> {
	return db
		.select({
			date: sales.date,
			revenue: sql`sum(${sales.revenue})`.mapWith(Number),
			profit: sql`sum(${sales.profit})`.mapWith(Number),
			salesCount: count(),
		})
		.from(sales)
		.where(
			and(
				eq(sales.storeId, storeId),
				active,
				gte(sales.date, start),
				lte(sales.date, end),
			),
		)
		.groupBy(sales.date);
}
