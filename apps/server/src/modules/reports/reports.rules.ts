import { saleChannel, type saleCostKind } from "../../db/schema";
import { divideRounded } from "../../lib/money";
import { marginOf } from "../sales/sales.rules";
import {
	type LineResult,
	resultOfLines,
	type SaleLine,
} from "./reports.allocation";
import type { ReportsModel } from "./reports.model";
import {
	bucketStart,
	bucketStarts,
	type EvolutionUnit,
	type Range,
} from "./reports.period";

/*
 * The report of a period (docs/product/relatorios.md), from the active sales of the period as they were kept when
 * entered. Pure: the service only reads the rows and hands them here.
 */

type Report = ReportsModel["report"];
type Channel = Report["channels"][number]["channel"];
type CostKind = (typeof saleCostKind.enumValues)[number];

/** How many products each ranking shows. */
export const RANKING_SIZE = 5;

const NO_CATEGORY = "Sem categoria";

/** Names in alphabetical order, accents and case aside. */
const collator = new Intl.Collator("pt-BR");
const compareText = (a: string, b: string) => collator.compare(a, b);

export type SaleRow = {
	id: string;
	date: string;
	channel: Channel;
	resellerId: string | null;
	resellerName: string | null;
	revenue: number;
	profit: number;
	productsCost: number;
	saleCosts: number;
};

export type CostRow = { saleId: string; kind: CostKind; amount: number };

export type ItemRow = SaleLine & { saleId: string };

export type ReportData = {
	sales: SaleRow[];
	costs: CostRow[];
	items: ItemRow[];
};

const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);

function summaryOf(sales: SaleRow[]): Report["summary"] {
	const revenue = sum(sales.map((sale) => sale.revenue));
	const profit = sum(sales.map((sale) => sale.profit));
	return {
		revenue,
		profit,
		margin: marginOf(profit, revenue),
		count: sales.length,
		averageTicket: sales.length > 0 ? divideRounded(revenue, sales.length) : 0,
	};
}

/** Where each kind of cost shows in the report: the fees of the platform are "fees". */
const COST_FIELD = {
	freight: "freight",
	tax: "tax",
	platform_fee: "fees",
	commission: "commissions",
	other: "other",
} as const satisfies Record<CostKind, keyof Report["costs"]>;

function costsOf(sales: SaleRow[], costs: CostRow[]): Report["costs"] {
	const result: Report["costs"] = {
		products: sum(sales.map((sale) => sale.productsCost)),
		freight: 0,
		tax: 0,
		fees: 0,
		commissions: 0,
		other: 0,
	};
	for (const cost of costs) result[COST_FIELD[cost.kind]] += cost.amount;
	return result;
}

function evolutionOf(
	sales: SaleRow[],
	range: Range,
	unit: EvolutionUnit,
): Report["evolution"] {
	const bars = new Map(
		bucketStarts(unit, range).map((date) => [
			date,
			{ date, revenue: 0, profit: 0 },
		]),
	);
	for (const sale of sales) {
		const start = bucketStart(sale.date, unit, range);
		const bar = bars.get(start);
		// Every sale is inside the period, so its bar exists; a miss is a bug in the bars, not an empty one.
		if (!bar) throw new Error(`no bar starts on ${start}`);
		bar.revenue += sale.revenue;
		bar.profit += sale.profit;
	}
	return [...bars.values()];
}

function channelsOf(sales: SaleRow[]): Report["channels"] {
	return saleChannel.enumValues.map((channel) => {
		const inChannel = sales.filter((sale) => sale.channel === channel);
		return {
			channel,
			revenue: sum(inChannel.map((sale) => sale.revenue)),
			profit: sum(inChannel.map((sale) => sale.profit)),
		};
	});
}

/** What each reseller sold in the period. */
function resellerRevenue(sales: SaleRow[]) {
	const byReseller = new Map<
		string,
		{ id: string; name: string; revenue: number }
	>();
	for (const sale of sales) {
		if (!sale.resellerId) continue;
		const row = byReseller.get(sale.resellerId) ?? {
			id: sale.resellerId,
			name: sale.resellerName ?? "",
			revenue: 0,
		};
		row.revenue += sale.revenue;
		byReseller.set(sale.resellerId, row);
	}
	return [...byReseller.values()];
}

/** The commission each reseller's sales paid her: only the `commission` costs of her sales. */
function commissionByReseller(sales: SaleRow[], costs: CostRow[]) {
	const resellerOfSale = new Map(
		sales.map((sale) => [sale.id, sale.resellerId]),
	);
	const commission = new Map<string, number>();
	for (const cost of costs) {
		const resellerId = resellerOfSale.get(cost.saleId);
		if (!resellerId || cost.kind !== "commission") continue;
		commission.set(resellerId, (commission.get(resellerId) ?? 0) + cost.amount);
	}
	return commission;
}

/** Each reseller with sales in the period: what she sold and the commission those sales paid her, biggest first. */
function resellersOf(sales: SaleRow[], costs: CostRow[]): Report["resellers"] {
	const commission = commissionByReseller(sales, costs);
	return resellerRevenue(sales)
		.map((row) => ({ ...row, commission: commission.get(row.id) ?? 0 }))
		.sort((a, b) => b.revenue - a.revenue || compareText(a.name, b.name));
}

/** Every line of every sale with its share of the revenue and profit (`resultOfLines`). */
function lineResultsOf({ sales, items }: ReportData): LineResult[] {
	const bySale = Map.groupBy(items, (item) => item.saleId);
	return sales.flatMap((sale) => {
		const lines = bySale.get(sale.id);
		if (!lines) throw new Error(`sale ${sale.id} has no lines`);
		return resultOfLines(sale, lines);
	});
}

type ProductTotals = {
	productId: string;
	name: string;
	quantity: number;
	revenue: number;
	profit: number;
};

function productTotalsOf(results: LineResult[]): ProductTotals[] {
	const byProduct = new Map<string, ProductTotals>();
	for (const line of results) {
		const row = byProduct.get(line.productId) ?? {
			productId: line.productId,
			name: line.productName,
			quantity: 0,
			revenue: 0,
			profit: 0,
		};
		row.quantity += line.quantity;
		row.revenue += line.revenue;
		row.profit += line.profit;
		byProduct.set(line.productId, row);
	}
	return [...byProduct.values()];
}

type Ranked = Report["products"]["bestSellers"][number];

const byName = (a: Ranked, b: Ranked) =>
	compareText(a.name, b.name) || a.productId.localeCompare(b.productId);

/** A product with a margin: it sold for money, not only as a gift. */
type Measured = Ranked & { margin: number };

const hasMargin = (product: Ranked): product is Measured =>
	product.margin !== null;

const top = <T extends Ranked>(
	products: T[],
	compare: (a: T, b: T) => number,
) =>
	products
		.toSorted((a, b) => compare(a, b) || byName(a, b))
		.slice(0, RANKING_SIZE);

/**
 * The four rankings of the products that sold in the period, `RANKING_SIZE` each. The ones by margin leave out a
 * product with no revenue (only given away): there's no margin to compare.
 */
function rankingsOf(results: LineResult[]): Report["products"] {
	const products: Ranked[] = productTotalsOf(results).map((row) => ({
		productId: row.productId,
		name: row.name,
		quantity: row.quantity,
		revenue: row.revenue,
		margin: marginOf(row.profit, row.revenue),
	}));
	const withMargin = products.filter(hasMargin);
	return {
		bestSellers: top(
			products,
			(a, b) => b.quantity - a.quantity || b.revenue - a.revenue,
		),
		worstSellers: top(
			products,
			(a, b) => a.quantity - b.quantity || a.revenue - b.revenue,
		),
		bestMargin: top(
			withMargin,
			(a, b) => b.margin - a.margin || b.revenue - a.revenue,
		),
		worstMargin: top(
			withMargin,
			(a, b) => a.margin - b.margin || b.revenue - a.revenue,
		),
	};
}

/** Revenue and profit of each category, from the lines; products without one go in "Sem categoria". */
function categoriesOf(results: LineResult[]): Report["categories"] {
	const byCategory = new Map<string, Report["categories"][number]>();
	for (const line of results) {
		const key = line.categoryId ?? "";
		const row = byCategory.get(key) ?? {
			id: line.categoryId,
			name: line.categoryName ?? NO_CATEGORY,
			revenue: 0,
			profit: 0,
		};
		row.revenue += line.revenue;
		row.profit += line.profit;
		byCategory.set(key, row);
	}
	return [...byCategory.values()].sort(
		(a, b) => b.revenue - a.revenue || compareText(a.name, b.name),
	);
}

export function buildReport(
	data: ReportData,
	range: Range,
	unit: EvolutionUnit,
): Report {
	const results = lineResultsOf(data);
	return {
		from: range.from,
		to: range.to,
		summary: summaryOf(data.sales),
		evolutionUnit: unit,
		evolution: evolutionOf(data.sales, range, unit),
		costs: costsOf(data.sales, data.costs),
		channels: channelsOf(data.sales),
		products: rankingsOf(results),
		categories: categoriesOf(results),
		resellers: resellersOf(data.sales, data.costs),
	};
}
