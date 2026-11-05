/**
 * FAKE BACKEND (MUN-21): alerts (docs/product/alertas.md). Computed from the data, never stored, so they disappear by
 * themselves once the problem is solved. A product can have several. Archived products don't alert.
 */
import {
	addDays,
	daysBetween,
	daysUntilExpiry,
	isExpired,
	todayISODate,
	toISODate,
} from "@/lib/dates";
import { formatRatio } from "@/lib/money";
import { db, type ProductRow } from "@/queries/fake/fake-db";
import { fakeRequest } from "@/queries/fake/fake-server";
import {
	type ProductResult,
	resultsByProduct,
	salesInRange,
} from "@/queries/fake/product-results";
import { lotsOf, stockOf } from "@/queries/fake/stock-ledger";
import { paginate } from "@/queries/pagination";
import type {
	Alert,
	AlertGroup,
	AlertKind,
	AlertListFilters,
	AlertPage,
} from "./alerts.types";

const GROUPS: Record<AlertKind, AlertGroup> = {
	out_of_stock: "stock",
	low_stock: "stock",
	expired: "expiry",
	near_expiry: "expiry",
	negative_margin: "margin",
	low_margin: "margin",
	stale: "stale",
};

const pluralUnits = (count: number) =>
	`${count} ${count === 1 ? "unidade" : "unidades"}`;

function stockAlert(product: ProductRow, stock: number) {
	if (stock === 0)
		return { kind: "out_of_stock" as const, detail: "Quantidade zero" };
	if (product.minStock !== null && stock <= product.minStock) {
		return {
			kind: "low_stock" as const,
			detail: `${stock} em estoque, mínimo ${product.minStock}`,
		};
	}
	return null;
}

function expiryAlerts(product: ProductRow) {
	if (!product.hasExpiry) return [];
	const lots = lotsOf(product.id).filter((lot) => lot.expiry);
	const warning = db.current.settings.expiryWarningDays;
	const expired = lots.filter((lot) => lot.expiry && isExpired(lot.expiry));
	const near = lots.filter(
		(lot) =>
			lot.expiry &&
			!isExpired(lot.expiry) &&
			daysUntilExpiry(lot.expiry) <= warning,
	);
	return [
		expired.length > 0 && {
			kind: "expired" as const,
			detail: `${pluralUnits(sumQuantity(expired))} vencidas`,
		},
		near.length > 0 && {
			kind: "near_expiry" as const,
			detail: `${pluralUnits(sumQuantity(near))} vencem em até ${warning} dias`,
		},
	].filter((alert) => alert !== false);
}

function sumQuantity(lots: { quantity: number }[]) {
	return lots.reduce((sum, lot) => sum + lot.quantity, 0);
}

function marginAlert(result: ProductResult | undefined) {
	if (!result || result.revenueCents <= 0) return null;
	const margin = result.profitCents / result.revenueCents;
	const days = db.current.settings.staleProductDays;
	const detail = `Margem ${formatRatio(margin)} nos últimos ${days} dias`;
	if (margin < 0) return { kind: "negative_margin" as const, detail };
	if (margin * 100 < db.current.settings.lowMarginPercent) {
		return { kind: "low_margin" as const, detail };
	}
	return null;
}

/**
 * Has stock and no sale in the window. Never sold: counts from the first stock entry. PROVISIONAL, alertas.md leaves
 * this open.
 */
function staleAlert(product: ProductRow, stock: number, soldRecently: boolean) {
	if (stock === 0 || soldRecently) return null;
	const days = db.current.settings.staleProductDays;
	const firstEntry = db.current.movements
		.filter((m) => m.productId === product.id && m.quantity > 0)
		.map((m) => m.createdAt)
		.sort()[0];
	if (!firstEntry) return null;
	const age = daysBetween(toISODate(new Date(firstEntry)), todayISODate());
	if (age < days) return null;
	return {
		kind: "stale" as const,
		detail: `Sem venda há mais de ${days} dias`,
	};
}

function alertsOf(product: ProductRow, results: Map<string, ProductResult>) {
	const stock = stockOf(product.id);
	const result = results.get(product.id);
	const found = [
		stockAlert(product, stock),
		...expiryAlerts(product),
		marginAlert(result),
		staleAlert(product, stock, result !== undefined),
	].filter((alert) => alert !== null);
	return found.map(
		(alert): Alert => ({
			id: `${product.id}-${alert.kind}`,
			kind: alert.kind,
			productId: product.id,
			productName: product.name,
			detail: alert.detail,
		}),
	);
}

const ORDER: AlertKind[] = [
	"expired",
	"out_of_stock",
	"negative_margin",
	"near_expiry",
	"low_stock",
	"low_margin",
	"stale",
];

export function allAlerts(): Alert[] {
	const from = addDays(todayISODate(), -db.current.settings.staleProductDays);
	const results = resultsByProduct(salesInRange(from, null));
	return db.current.products
		.filter((product) => !product.archived)
		.flatMap((product) => alertsOf(product, results))
		.sort(
			(a, b) =>
				ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) ||
				a.productName.localeCompare(b.productName, "pt-BR"),
		);
}

function list(filters: AlertListFilters, cursor: number): AlertPage {
	const rows = allAlerts().filter(
		(alert) =>
			filters.groups.length === 0 ||
			filters.groups.includes(GROUPS[alert.kind]),
	);
	const counts: AlertPage["counts"] = {};
	for (const alert of rows) counts[alert.kind] = (counts[alert.kind] ?? 0) + 1;
	return { ...paginate(rows, cursor), counts };
}

export const alertsFake = {
	list: (filters: AlertListFilters, cursor: number) =>
		fakeRequest(() => list(filters, cursor)),
};
