/** FAKE BACKEND (MUN-21): reports (docs/product/relatorios.md). Canceled sales never count. */
import { ApiError } from "@/lib/api-error";
import {
	addDays,
	daysBetween,
	fromISODate,
	type ISODate,
	todayISODate,
	toISODate,
} from "@/lib/dates";
import { fromCents } from "@/lib/money";
import { db, type SaleRow } from "@/queries/fake/fake-db";
import { fakeRequest } from "@/queries/fake/fake-server";
import {
	type ProductResult,
	resultsByProduct,
	salesInRange,
	saleTotals,
} from "@/queries/fake/product-results";
import type { SaleChannel, SaleCostKind } from "@/queries/sales/sales.types";
import type {
	Report,
	ReportBucket,
	ReportPeriod,
	ReportProduct,
} from "./reports.types";

const RANKING_SIZE = 5;
const MAX_DAILY_BARS = 31;
const MAX_RANGE_DAYS = 5 * 366;

function monthRange(offset: number, today: ISODate) {
	const base = fromISODate(today);
	const first = new Date(base.getFullYear(), base.getMonth() + offset, 1);
	const last = new Date(base.getFullYear(), base.getMonth() + offset + 1, 0);
	return { from: toISODate(first), to: toISODate(last) };
}

export function periodRange(period: ReportPeriod, today = todayISODate()) {
	switch (period.kind) {
		case "today":
			return { from: today, to: today };
		case "7d":
			return { from: addDays(today, -6), to: today };
		case "month":
			return { from: monthRange(0, today).from, to: today };
		case "last_month":
			return monthRange(-1, today);
		case "custom":
			if (period.from > period.to) {
				throw new ApiError(
					"invalid_period",
					"A data inicial vem depois da final.",
				);
			}
			if (daysBetween(period.from, period.to) > MAX_RANGE_DAYS) {
				throw new ApiError(
					"invalid_period",
					"Escolha um período de até 5 anos.",
				);
			}
			return { from: period.from, to: period.to };
	}
}

const sum = <T>(rows: T[], value: (row: T) => number) =>
	rows.reduce((total, row) => total + value(row), 0);

function summary(sales: SaleRow[]): Report["summary"] {
	const totals = saleTotals(sales);
	return {
		revenue: fromCents(totals.revenueCents),
		profit: fromCents(totals.profitCents),
		margin: totals.margin,
		count: totals.count,
		averageTicket: fromCents(
			totals.count ? Math.round(totals.revenueCents / totals.count) : 0,
		),
	};
}

function dayLabel(date: ISODate) {
	const [, month, day] = date.split("-");
	return `${day}/${month}`;
}

function monthLabel(date: ISODate) {
	const [year, month] = date.split("-");
	return `${month}/${year}`;
}

function nextMonth(date: ISODate): ISODate {
	const base = fromISODate(date);
	return toISODate(new Date(base.getFullYear(), base.getMonth() + 1, 1));
}

function unitFor(days: number): Report["evolutionUnit"] {
	if (days <= MAX_DAILY_BARS) return "day";
	return days <= MAX_DAILY_BARS * 7 ? "week" : "month";
}

/** Bars for the period, empty ones included so gaps show. A bar per day, week or month, so they always fit. */
function evolution(sales: SaleRow[], from: ISODate, to: ISODate) {
	const unit = unitFor(daysBetween(from, to) + 1);
	const next = (start: ISODate) => {
		if (unit === "month") return nextMonth(start);
		return addDays(start, unit === "week" ? 7 : 1);
	};
	const buckets: ReportBucket[] = [];
	for (let start = from; start <= to; start = next(start)) {
		const end = next(start);
		const totals = saleTotals(
			sales.filter((s) => s.date >= start && s.date < end),
		);
		buckets.push({
			date: start,
			label: unit === "month" ? monthLabel(start) : dayLabel(start),
			revenue: fromCents(totals.revenueCents),
			profit: fromCents(totals.profitCents),
		});
	}
	return { evolution: buckets, evolutionUnit: unit };
}

function costs(sales: SaleRow[]): Report["costs"] {
	const allCosts = sales.flatMap((s) => s.costs);
	const ofKind = (kind: SaleCostKind) =>
		fromCents(
			sum(
				allCosts.filter((cost) => cost.kind === kind),
				(cost) => cost.amountCents,
			),
		);
	return {
		products: fromCents(sum(sales, (s) => s.productsCostCents)),
		freight: ofKind("freight"),
		tax: ofKind("tax"),
		fees: ofKind("platform_fee"),
		commissions: ofKind("commission"),
		other: ofKind("other"),
	};
}

function channels(sales: SaleRow[]): Report["channels"] {
	const all: SaleChannel[] = ["store", "mercado_livre", "reseller"];
	return all.map((channel) => {
		const within = sales.filter((s) => s.channel === channel);
		return {
			channel,
			revenue: fromCents(sum(within, (s) => s.revenueCents)),
			profit: fromCents(sum(within, (s) => s.profitCents)),
		};
	});
}

const marginOf = (result: ProductResult) =>
	result.revenueCents > 0 ? result.profitCents / result.revenueCents : null;

function toReportProduct(result: ProductResult): ReportProduct {
	const name = db.current.products.find((p) => p.id === result.productId)?.name;
	return {
		productId: result.productId,
		name: name ?? "Produto",
		quantity: result.quantity,
		revenue: fromCents(result.revenueCents),
		margin: marginOf(result),
	};
}

type Compare = (a: ProductResult, b: ProductResult) => number;

function rankings(results: ProductResult[]): Report["products"] {
	const top = (rows: ProductResult[], compare: Compare) =>
		[...rows].sort(compare).slice(0, RANKING_SIZE).map(toReportProduct);
	const ranked = (compare: Compare) => top(results, compare);
	// Without revenue there's no margin to rank.
	const withMargin = results.filter((result) => marginOf(result) !== null);
	return {
		bestSellers: ranked((a, b) => b.quantity - a.quantity),
		worstSellers: ranked((a, b) => a.quantity - b.quantity),
		bestMargin: top(
			withMargin,
			(a, b) => (marginOf(b) ?? 0) - (marginOf(a) ?? 0),
		),
		worstMargin: top(
			withMargin,
			(a, b) => (marginOf(a) ?? 0) - (marginOf(b) ?? 0),
		),
	};
}

function categories(results: ProductResult[]): Report["categories"] {
	const byName = new Map<string, { revenue: number; profit: number }>();
	for (const result of results) {
		const product = db.current.products.find((p) => p.id === result.productId);
		const category = db.current.categories.find(
			(c) => c.id === product?.categoryId,
		);
		const name = category?.name ?? "Sem categoria";
		const current = byName.get(name) ?? { revenue: 0, profit: 0 };
		byName.set(name, {
			revenue: current.revenue + result.revenueCents,
			profit: current.profit + result.profitCents,
		});
	}
	return [...byName.entries()]
		.sort((a, b) => b[1].revenue - a[1].revenue)
		.map(([name, totals]) => ({
			name,
			revenue: fromCents(totals.revenue),
			profit: fromCents(totals.profit),
		}));
}

/** Archived resellers still show for the periods they sold in (relatorios.md). */
function resellers(sales: SaleRow[]): Report["resellers"] {
	return db.current.resellers
		.map((reseller) => {
			const within = sales.filter((s) => s.resellerId === reseller.id);
			const commission = sum(
				within.flatMap((s) => s.costs).filter((c) => c.kind === "commission"),
				(c) => c.amountCents,
			);
			return {
				id: reseller.id,
				name: reseller.name,
				count: within.length,
				revenue: fromCents(sum(within, (s) => s.revenueCents)),
				commission: fromCents(commission),
			};
		})
		.filter((row) => row.count > 0)
		.map(({ count: _count, ...row }) => row);
}

function report(period: ReportPeriod): Report {
	const { from, to } = periodRange(period);
	const sales = salesInRange(from, to);
	const results = [...resultsByProduct(sales).values()];
	return {
		from,
		to,
		summary: summary(sales),
		...evolution(sales, from, to),
		costs: costs(sales),
		channels: channels(sales),
		products: rankings(results),
		categories: categories(results),
		resellers: resellers(sales),
	};
}

export const reportsFake = {
	report: (period: ReportPeriod) => fakeRequest(() => report(period)),
};
