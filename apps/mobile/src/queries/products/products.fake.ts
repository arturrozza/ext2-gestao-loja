/** FAKE BACKEND (MUN-21): products, categories and stock (docs/product/produtos.md, estoque.md). */
import { ApiError } from "@/lib/api-error";
import { daysUntilExpiry, isExpired } from "@/lib/dates";
import { fromCents, toCents } from "@/lib/money";
import { matchesSearch, normalizeSearch } from "@/lib/search";
import {
	db,
	findOrThrow,
	type MovementRow,
	nextId,
	nowISO,
	type ProductRow,
} from "@/queries/fake/fake-db";
import { fakeRequest, notFound } from "@/queries/fake/fake-server";
import {
	adjust,
	correctCost,
	lotsOf,
	sellableStock,
	stockOf,
} from "@/queries/fake/stock-ledger";
import { type Page, paginate } from "@/queries/pagination";
import type {
	Category,
	CostCorrectionInput,
	ExpiryBalance,
	Movement,
	ProductDetail,
	ProductInput,
	ProductListFilters,
	ProductListItem,
	ProductListPage,
	StockAdjustmentInput,
	StockFilter,
	StockFlags,
} from "./products.types";

const productNotFound = () => notFound("Produto");

export function findProduct(id: string): ProductRow {
	return findOrThrow(db.current.products, id, productNotFound);
}

function expiryState(expiry: string | null) {
	if (!expiry) return { expired: false, nearExpiry: false };
	const expired = isExpired(expiry);
	const nearExpiry =
		!expired &&
		daysUntilExpiry(expiry) <= db.current.settings.expiryWarningDays;
	return { expired, nearExpiry };
}

function flagsOf(row: ProductRow, stock: number): StockFlags {
	// A product without expiry never gets expiry flags (alertas.md), even with old lots from before it was turned off.
	const states = row.hasExpiry
		? lotsOf(row.id).map((lot) => expiryState(lot.expiry))
		: [];
	const outOfStock = stock === 0;
	return {
		outOfStock,
		lowStock: !outOfStock && row.minStock !== null && stock <= row.minStock,
		nearExpiry: states.some((state) => state.nearExpiry),
		expired: states.some((state) => state.expired),
	};
}

export function toListItem(row: ProductRow): ProductListItem {
	const stock = stockOf(row.id);
	const category = db.current.categories.find((c) => c.id === row.categoryId);
	return {
		id: row.id,
		name: row.name,
		photoUri: row.photoUri,
		categoryId: row.categoryId,
		categoryName: category?.name ?? null,
		barcode: row.barcode,
		internalCode: row.internalCode,
		location: row.location,
		minStock: row.minStock,
		hasExpiry: row.hasExpiry,
		basePrice: fromCents(row.basePriceCents),
		archived: row.archived,
		stock,
		sellableStock: sellableStock(row.id),
		averageCost: fromCents(row.averageCostCents),
		stockValue: fromCents(stock * row.averageCostCents),
		flags: flagsOf(row, stock),
	};
}

const STOCK_FILTERS: Record<StockFilter, (item: ProductListItem) => boolean> = {
	in_stock: (item) => item.stock > 0,
	low: (item) => item.flags.lowStock,
	out: (item) => item.flags.outOfStock,
	near_expiry: (item) => item.flags.nearExpiry,
	expired: (item) => item.flags.expired,
};

/** Within a filter any choice matches; between filters all must match. */
function matchesStock(item: ProductListItem, filters: ProductListFilters) {
	if (filters.stock.length === 0 && !filters.inStock) return true;
	return (
		filters.stock.some((state) => STOCK_FILTERS[state](item)) ||
		(filters.inStock === true && item.sellableStock > 0)
	);
}

function matchesCategory(item: ProductListItem, categoryIds: string[]) {
	if (categoryIds.length === 0) return true;
	return item.categoryId !== null && categoryIds.includes(item.categoryId);
}

function matches(item: ProductListItem, filters: ProductListFilters) {
	if (item.archived !== filters.archived) return false;
	if (!matchesCategory(item, filters.categoryIds)) return false;
	if (!matchesStock(item, filters)) return false;
	return matchesSearch(
		filters.search,
		item.name,
		item.internalCode,
		item.barcode,
	);
}

function list(filters: ProductListFilters, cursor: number): ProductListPage {
	const all = db.current.products.map(toListItem);
	const totalCents = all
		.filter((item) => !item.archived)
		.reduce((sum, item) => sum + toCents(item.stockValue), 0);
	const rows = all
		.filter((item) => matches(item, filters))
		.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
	return { ...paginate(rows, cursor), totalStockValue: fromCents(totalCents) };
}

function expiries(productId: string): ExpiryBalance[] {
	const byExpiry = new Map<string | null, number>();
	for (const lot of lotsOf(productId)) {
		byExpiry.set(lot.expiry, (byExpiry.get(lot.expiry) ?? 0) + lot.quantity);
	}
	return [...byExpiry.entries()]
		.map(([expiry, quantity]) => ({
			expiry,
			quantity,
			...expiryState(expiry),
		}))
		.sort((a, b) =>
			(a.expiry ?? "9999-12").localeCompare(b.expiry ?? "9999-12"),
		);
}

function originOf(row: MovementRow): Movement["origin"] {
	if (row.purchaseId) {
		const purchase = db.current.purchases.find((p) => p.id === row.purchaseId);
		return purchase
			? { kind: "purchase", id: purchase.id, number: purchase.number }
			: null;
	}
	if (row.saleId) {
		const sale = db.current.sales.find((s) => s.id === row.saleId);
		return sale ? { kind: "sale", id: sale.id, number: sale.number } : null;
	}
	return null;
}

function toMovement(row: MovementRow): Movement {
	return {
		id: row.id,
		type: row.type,
		quantity: row.quantity,
		unitCost: fromCents(row.unitCostCents),
		averageCostAfter: fromCents(row.averageCostAfterCents),
		stockAfter: row.stockAfter,
		reason: row.reason,
		note: row.note,
		origin: originOf(row),
		createdAt: row.createdAt,
		author: row.author,
	};
}

function detail(id: string): ProductDetail {
	const row = findProduct(id);
	return {
		...toListItem(row),
		expiries: expiries(id),
		createdAt: row.createdAt,
	};
}

function movements(id: string, cursor: number): Page<Movement> {
	const rows = db.current.movements
		.filter((movement) => movement.productId === id)
		.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	return paginate(rows.map(toMovement), cursor);
}

/** Internal code and barcode are unique in the store, archived products included (produtos.md). */
function assertUniqueCodes(input: ProductInput, exceptId?: string) {
	const others = db.current.products.filter((p) => p.id !== exceptId);
	if (input.barcode && others.some((p) => p.barcode === input.barcode)) {
		throw new ApiError(
			"duplicate_barcode",
			"Já existe um produto com esse código de barras.",
			{ field: "barcode" },
		);
	}
	if (
		input.internalCode &&
		others.some((p) => p.internalCode === input.internalCode)
	) {
		throw new ApiError(
			"duplicate_internal_code",
			"Já existe um produto com esse código interno.",
			{ field: "internalCode" },
		);
	}
}

function applyInput(row: ProductRow, input: ProductInput) {
	row.name = input.name;
	row.basePriceCents = toCents(input.basePrice);
	row.categoryId = input.categoryId;
	row.barcode = input.barcode;
	row.internalCode = input.internalCode;
	row.minStock = input.minStock;
	row.location = input.location;
	row.hasExpiry = input.hasExpiry;
	row.photoUri = input.photoUri;
}

export function insertProduct(input: ProductInput, createdAt = nowISO()) {
	assertUniqueCodes(input);
	const row: ProductRow = {
		id: nextId("product"),
		archived: false,
		averageCostCents: 0,
		createdAt,
		name: "",
		basePriceCents: 0,
		categoryId: null,
		barcode: null,
		internalCode: null,
		minStock: null,
		location: null,
		hasExpiry: false,
		photoUri: null,
	};
	applyInput(row, input);
	db.current.products.push(row);
	return row;
}

function categories(): Category[] {
	return db.current.categories
		.map((category) => ({
			id: category.id,
			name: category.name,
			productCount: db.current.products.filter(
				(p) => p.categoryId === category.id && !p.archived,
			).length,
		}))
		.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function insertCategory(name: string): Category {
	const clean = name.trim();
	const exists = db.current.categories.some(
		(category) => normalizeSearch(category.name) === normalizeSearch(clean),
	);
	if (exists) {
		throw new ApiError("duplicate_category", "Essa categoria já existe.", {
			field: "name",
		});
	}
	const row = { id: nextId("category"), name: clean, createdAt: nowISO() };
	db.current.categories.push(row);
	return { id: row.id, name: row.name, productCount: 0 };
}

export const productsFake = {
	list: (filters: ProductListFilters, cursor: number) =>
		fakeRequest(() => list(filters, cursor)),

	detail: (id: string) => fakeRequest(() => detail(id)),

	movements: (id: string, cursor: number) =>
		fakeRequest(() => movements(id, cursor)),

	create: (input: ProductInput) =>
		fakeRequest(() => toListItem(insertProduct(input))),

	update: (id: string, input: ProductInput) =>
		fakeRequest(() => {
			const row = findProduct(id);
			assertUniqueCodes(input, id);
			applyInput(row, input);
			return toListItem(row);
		}),

	setArchived: (id: string, archived: boolean) =>
		fakeRequest(() => {
			const row = findProduct(id);
			row.archived = archived;
			return toListItem(row);
		}),

	adjustStock: (id: string, input: StockAdjustmentInput) =>
		fakeRequest(() => {
			adjust({
				product: findProduct(id),
				newQuantity: input.newQuantity,
				reason: input.reason,
				note: input.note,
				fromExpiry: input.fromExpiry,
				expiry: input.expiry,
			});
			return detail(id);
		}),

	correctCost: (id: string, input: CostCorrectionInput) =>
		fakeRequest(() => {
			correctCost(findProduct(id), toCents(input.newCost), input.note);
			return detail(id);
		}),

	categories: () => fakeRequest(categories),

	createCategory: (name: string) => fakeRequest(() => insertCategory(name)),
};
