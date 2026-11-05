/** FAKE BACKEND (MUN-21): sales (docs/product/vendas.md). */
import { ApiError } from "@/lib/api-error";
import { addDays, type ISODate, todayISODate } from "@/lib/dates";
import { fromCents, toCents } from "@/lib/money";
import { computeSale } from "@/lib/sale-math";
import { findCustomer } from "@/queries/customers/customers.fake";
import { describeItems, previewItems } from "@/queries/fake/describe-items";
import {
	db,
	findOrThrow,
	nextId,
	nowISO,
	type SaleRow,
} from "@/queries/fake/fake-db";
import { fakeRequest, notFound } from "@/queries/fake/fake-server";
import { giveBack, sellableStock, take } from "@/queries/fake/stock-ledger";
import { paginate } from "@/queries/pagination";
import { findProduct } from "@/queries/products/products.fake";
import { findReseller } from "@/queries/resellers/resellers.fake";
import type {
	SaleDetail,
	SaleInput,
	SaleListFilters,
	SalePage,
	SalePeriod,
	SaleSummary,
} from "./sales.types";

const saleNotFound = () => notFound("Venda");

function nameOf(rows: { id: string; name: string }[], id: string | null) {
	return id ? (rows.find((row) => row.id === id)?.name ?? null) : null;
}

function toSummary(row: SaleRow): SaleSummary {
	return {
		id: row.id,
		number: row.number,
		date: row.date,
		createdAt: row.createdAt,
		channel: row.channel,
		status: row.canceledAt ? "canceled" : "active",
		description: describeItems(row.items.map((item) => item.productId)),
		...previewItems(row.items.map((item) => item.productId)),
		customerName: nameOf(db.current.customers, row.customerId),
		resellerName: nameOf(db.current.resellers, row.resellerId),
		revenue: fromCents(row.revenueCents),
		profit: fromCents(row.profitCents),
	};
}

function toDetail(row: SaleRow): SaleDetail {
	return {
		...toSummary(row),
		items: row.items.map((item, index) => ({
			id: `${row.id}-${index}`,
			productId: item.productId,
			productName: nameOf(db.current.products, item.productId) ?? "Produto",
			photoUri:
				db.current.products.find((p) => p.id === item.productId)?.photoUri ??
				null,
			quantity: item.quantity,
			unitPrice: fromCents(item.unitPriceCents),
			unitCost: fromCents(item.unitCostCents),
			total: fromCents(item.quantity * item.unitPriceCents),
		})),
		discount: fromCents(row.discountCents),
		surcharge: fromCents(row.surchargeCents),
		costs: row.costs.map((cost, index) => ({
			id: `${row.id}-cost-${index}`,
			kind: cost.kind,
			mode: cost.mode,
			value:
				cost.mode === "amount" ? fromCents(cost.value) : String(cost.value),
			label: cost.label,
			amount: fromCents(cost.amountCents),
		})),
		productsCost: fromCents(row.productsCostCents),
		saleCosts: fromCents(row.saleCostsCents),
		margin: row.revenueCents > 0 ? row.profitCents / row.revenueCents : null,
		paymentCondition: row.paymentCondition,
		paymentMethod: row.paymentMethod,
		customerId: row.customerId,
		resellerId: row.resellerId,
		author: row.author,
		canceledAt: row.canceledAt,
		cancelReason: row.cancelReason,
	};
}

/** First day of the period (inclusive), or `null` for all time. */
export function periodStart(
	period: SalePeriod,
	today = todayISODate(),
): ISODate | null {
	if (period === "today") return today;
	if (period === "7d") return addDays(today, -6);
	if (period === "month") return `${today.slice(0, 7)}-01`;
	return null;
}

/** "Com lucro": profit above zero. "Com prejuízo": below zero. A sale that breaks even is in neither. */
function matchesResult(row: SaleRow, result: SaleListFilters["result"]) {
	if (result === "profit") return row.profitCents > 0;
	if (result === "loss") return row.profitCents < 0;
	return true;
}

function matches(
	row: SaleRow,
	filters: SaleListFilters,
	start: ISODate | null,
) {
	if (start && row.date < start) return false;
	if (filters.channels.length > 0 && !filters.channels.includes(row.channel)) {
		return false;
	}
	if (!matchesResult(row, filters.result)) return false;
	if (filters.customerId && row.customerId !== filters.customerId) return false;
	if (filters.resellerId && row.resellerId !== filters.resellerId) return false;
	return true;
}

function list(filters: SaleListFilters, cursor: number): SalePage {
	const start = periodStart(filters.period);
	const rows = db.current.sales
		.filter((row) => matches(row, filters, start))
		.sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number);
	const active = rows.filter((row) => !row.canceledAt);
	return {
		...paginate(rows.map(toSummary), cursor),
		totals: {
			revenue: fromCents(
				active.reduce((sum, row) => sum + row.revenueCents, 0),
			),
			profit: fromCents(active.reduce((sum, row) => sum + row.profitCents, 0)),
			count: active.length,
		},
	};
}

function assertParties(input: SaleInput) {
	if (input.channel === "reseller") {
		if (!input.resellerId) {
			throw new ApiError("reseller_required", "Escolha a revendedora.", {
				field: "resellerId",
			});
		}
		if (findReseller(input.resellerId).archived) {
			throw new ApiError(
				"archived_reseller",
				"Essa revendedora está arquivada.",
			);
		}
	}
	if (input.customerId && findCustomer(input.customerId).archived) {
		throw new ApiError("archived_customer", "Esse cliente está arquivado.");
	}
}

/** Every item is checked before any unit leaves, so the error lists all the missing ones (vendas.md). */
function assertStock(input: SaleInput) {
	const wanted = new Map<string, number>();
	for (const item of input.items) {
		wanted.set(
			item.productId,
			(wanted.get(item.productId) ?? 0) + item.quantity,
		);
	}
	const missing = [...wanted.entries()]
		.map(([productId, quantity]) => ({
			productId,
			quantity,
			available: sellableStock(productId),
		}))
		.filter((item) => item.available < item.quantity);
	if (missing.length > 0) {
		const first = missing[0];
		throw new ApiError(
			"insufficient_stock",
			`Estoque insuficiente: disponível ${first?.available ?? 0}.`,
			{ items: missing },
		);
	}
}

function assertSale(input: SaleInput) {
	if (input.items.length === 0) {
		throw new ApiError("no_items", "Adicione pelo menos um produto.");
	}
	if (input.date > todayISODate()) {
		throw new ApiError("future_date", "A data da venda não pode ser futura.", {
			field: "date",
		});
	}
	for (const item of input.items) {
		if (!Number.isInteger(item.quantity) || item.quantity < 1) {
			throw new ApiError("invalid_quantity", "Quantidade maior que zero.");
		}
		if (toCents(item.unitPrice) < 0) {
			throw new ApiError("invalid_price", "O preço não pode ser negativo.");
		}
		if (findProduct(item.productId).archived) {
			throw new ApiError(
				"archived_product",
				"Produto arquivado não entra em vendas.",
			);
		}
	}
	assertParties(input);
	assertStock(input);
}

/** Registers the sale: units leave the stock (nearest expiry first) at today's average cost; totals are stored. */
export function insertSale(input: SaleInput, createdAt = nowISO()): SaleRow {
	assertSale(input);
	const id = nextId("sale");
	const items = input.items.map((item) => {
		const product = findProduct(item.productId);
		const unitCostCents = product.averageCostCents;
		return {
			productId: product.id,
			quantity: item.quantity,
			unitPriceCents: toCents(item.unitPrice),
			unitCostCents,
			takenFrom: take(product, item.quantity, id, createdAt),
		};
	});
	const costs = input.costs.map((cost) => ({
		kind: cost.kind,
		mode: cost.mode,
		value: cost.mode === "amount" ? toCents(cost.value) : Number(cost.value),
		label: cost.label,
	}));
	const math = computeSale({
		items,
		discountCents: toCents(input.discount),
		surchargeCents: toCents(input.surcharge),
		costs,
	});
	if (math.revenueCents < 0) {
		throw new ApiError(
			"negative_revenue",
			"O desconto é maior que o valor da venda.",
		);
	}
	const row: SaleRow = {
		id,
		number: db.current.sales.length + 1,
		date: input.date,
		channel: input.channel,
		items,
		discountCents: toCents(input.discount),
		surchargeCents: toCents(input.surcharge),
		costs: costs.map((cost, index) => ({
			...cost,
			amountCents: math.costAmountsCents[index] ?? 0,
		})),
		paymentCondition: input.paymentCondition,
		paymentMethod: input.paymentMethod,
		customerId: input.customerId,
		resellerId: input.channel === "reseller" ? input.resellerId : null,
		revenueCents: math.revenueCents,
		productsCostCents: math.productsCostCents,
		saleCostsCents: math.saleCostsCents,
		profitCents: math.profitCents,
		canceledAt: null,
		cancelReason: null,
		createdAt,
		author: db.current.user.name,
	};
	db.current.sales.push(row);
	return row;
}

/** Units go back to the same lots; the average cost doesn't change; the sale stays, marked (vendas.md). */
export function cancelSaleRow(id: string, reason: string) {
	const row = findOrThrow(db.current.sales, id, saleNotFound);
	if (row.canceledAt)
		throw new ApiError("already_canceled", "Esta venda já foi cancelada.");
	if (!reason.trim()) {
		throw new ApiError("reason_required", "Informe o motivo.", {
			field: "reason",
		});
	}
	for (const item of row.items) {
		giveBack(
			findProduct(item.productId),
			item.takenFrom,
			item.unitCostCents,
			row.id,
		);
	}
	row.canceledAt = nowISO();
	row.cancelReason = reason.trim();
	return toDetail(row);
}

export const salesFake = {
	list: (filters: SaleListFilters, cursor: number) =>
		fakeRequest(() => list(filters, cursor)),

	detail: (id: string) =>
		fakeRequest(() =>
			toDetail(findOrThrow(db.current.sales, id, saleNotFound)),
		),

	create: (input: SaleInput) => fakeRequest(() => toDetail(insertSale(input))),

	cancel: (id: string, reason: string) =>
		fakeRequest(() => cancelSaleRow(id, reason)),
};
