/** FAKE BACKEND (MUN-21): purchases (docs/product/compras.md). */
import { ApiError } from "@/lib/api-error";
import { fromCents, toCents } from "@/lib/money";
import { describeItems, previewItems } from "@/queries/fake/describe-items";
import {
	db,
	findOrThrow,
	nextId,
	nowISO,
	type PurchaseRow,
} from "@/queries/fake/fake-db";
import { fakeRequest, notFound } from "@/queries/fake/fake-server";
import {
	lotUntouched,
	receive,
	reverseEntry,
} from "@/queries/fake/stock-ledger";
import { paginate } from "@/queries/pagination";
import { findProduct } from "@/queries/products/products.fake";
import type {
	PurchaseDetail,
	PurchaseInput,
	PurchaseListFilters,
	PurchasePage,
	PurchaseSummary,
} from "./purchases.types";

const purchaseNotFound = () => notFound("Compra");

function productName(id: string) {
	return db.current.products.find((p) => p.id === id)?.name ?? "Produto";
}

function toSummary(row: PurchaseRow): PurchaseSummary {
	return {
		id: row.id,
		number: row.number,
		date: row.date,
		status: row.canceledAt ? "canceled" : "active",
		itemCount: row.items.length,
		unitCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
		total: fromCents(
			row.items.reduce(
				(sum, item) => sum + item.quantity * item.unitCostCents,
				0,
			),
		),
		description: describeItems(row.items.map((item) => item.productId)),
		...previewItems(row.items.map((item) => item.productId)),
	};
}

function lotsOfPurchase(row: PurchaseRow) {
	return row.items.map((item) =>
		findOrThrow(db.current.lots, item.lotId, () => notFound("Lote")),
	);
}

function cancelBlockedReason(row: PurchaseRow): string | null {
	if (row.canceledAt) return "Esta compra já foi cancelada.";
	const used = lotsOfPurchase(row).some((lot) => !lotUntouched(lot));
	return used
		? 'Unidades desta compra já saíram do estoque (venda ou ajuste). Para corrigir, use o ajuste de estoque ou "Corrigir custo".'
		: null;
}

function toDetail(row: PurchaseRow): PurchaseDetail {
	return {
		...toSummary(row),
		note: row.note,
		items: row.items.map((item) => ({
			id: item.lotId,
			productId: item.productId,
			productName: productName(item.productId),
			photoUri:
				db.current.products.find((p) => p.id === item.productId)?.photoUri ??
				null,
			quantity: item.quantity,
			unitCost: fromCents(item.unitCostCents),
			total: fromCents(item.quantity * item.unitCostCents),
			expiry: item.expiry,
		})),
		createdAt: row.createdAt,
		author: row.author,
		canceledAt: row.canceledAt,
		cancelBlockedReason: cancelBlockedReason(row),
	};
}

function list(filters: PurchaseListFilters, cursor: number): PurchasePage {
	const rows = db.current.purchases
		.map(toSummary)
		.filter((p) => !filters.status || p.status === filters.status)
		.sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number);
	return paginate(rows, cursor);
}

/** Creates the purchase: one lot and one "purchase" movement per item; stock and average cost update. */
export function insertPurchase(input: PurchaseInput, createdAt = nowISO()) {
	if (input.items.length === 0) {
		throw new ApiError("no_items", "Adicione pelo menos um produto.");
	}
	const id = nextId("purchase");
	const row: PurchaseRow = {
		id,
		number: db.current.purchases.length + 1,
		date: input.date,
		note: input.note,
		items: [],
		canceledAt: null,
		createdAt,
		author: db.current.user.name,
	};
	for (const item of input.items) {
		const product = findProduct(item.productId);
		if (product.archived) {
			throw new ApiError(
				"archived_product",
				`${product.name} está arquivado e não entra em novas compras.`,
			);
		}
		const lot = receive({
			product,
			quantity: item.quantity,
			unitCostCents: toCents(item.unitCost),
			expiry: item.expiry,
			purchaseId: id,
			createdAt,
		});
		row.items.push({
			productId: product.id,
			quantity: item.quantity,
			unitCostCents: toCents(item.unitCost),
			expiry: lot.expiry,
			lotId: lot.id,
		});
	}
	db.current.purchases.push(row);
	return row;
}

function cancel(id: string) {
	const row = findOrThrow(db.current.purchases, id, purchaseNotFound);
	const blocked = cancelBlockedReason(row);
	if (blocked) throw new ApiError("cannot_cancel", blocked);
	for (const item of row.items) {
		const lot = findOrThrow(db.current.lots, item.lotId, () =>
			notFound("Lote"),
		);
		reverseEntry(findProduct(item.productId), lot, item.unitCostCents);
	}
	row.canceledAt = nowISO();
	return toDetail(row);
}

export const purchasesFake = {
	list: (filters: PurchaseListFilters, cursor: number) =>
		fakeRequest(() => list(filters, cursor)),

	detail: (id: string) =>
		fakeRequest(() =>
			toDetail(findOrThrow(db.current.purchases, id, purchaseNotFound)),
		),

	create: (input: PurchaseInput) =>
		fakeRequest(() => toDetail(insertPurchase(input))),

	cancel: (id: string) => fakeRequest(() => cancel(id)),
};
