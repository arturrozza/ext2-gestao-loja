import type { ExpiryMonth } from "@/lib/dates";
import type { Money } from "@/lib/money";
import type { Page } from "@/queries/pagination";

/** A product as the API sends it (docs/product/produtos.md). Stock and cost come with Compras and Estoque (MUN-12/13). */
export type Product = {
	id: string;
	name: string;
	basePrice: Money;
	categoryId: string | null;
	categoryName: string | null;
	barcode: string | null;
	internalCode: string | null;
	minStock: number | null;
	location: string | null;
	hasExpiry: boolean;
	archived: boolean;
};

export type ProductListFilters = {
	/** Name, internal code or barcode. */
	search: string;
	/** Any of these; empty means every category. */
	categoryIds: string[];
	/** `true` lists only archived products; `false` only active ones. */
	archived: boolean;
};

export type ProductPage = Page<Product>;

/** What the product form edits. Stock and cost never: they only come from purchases (produtos.md). */
export type ProductInput = {
	name: string;
	basePrice: Money;
	categoryId: string | null;
	barcode: string | null;
	internalCode: string | null;
	minStock: number | null;
	location: string | null;
	hasExpiry: boolean;
};

/** Store category: just a name (produtos.md). Archived ones keep their products but can't be picked. */
export type Category = {
	id: string;
	name: string;
	archived: boolean;
	/** Active products in it. */
	productCount: number;
};

/*
 * Stock contract (estoque.md), used by the screens of sales, purchases and stock corrections. Those modules are under
 * construction (MUN-12/13/16): nothing below comes from the API yet.
 */

/** Stock filters of the product list (docs/product/estoque.md). */
export type StockFilter =
	| "in_stock"
	| "low"
	| "out"
	| "near_expiry"
	| "expired";

/** A product shown as a thumb in a sale or purchase row. */
export type ItemPreview = {
	productId: string;
	name: string;
	photoUri: string | null;
};

/** The product list with stock filters (the picker of sales and purchases). */
export type StockListFilters = ProductListFilters & {
	/** Any of these states; empty means every product. */
	stock: StockFilter[];
	/** Also a state: products with sellable stock. */
	inStock?: boolean;
};

export type StockFlags = {
	/** Quantity at or below the minimum (and not zero). */
	lowStock: boolean;
	outOfStock: boolean;
	/** Has units within the "expiry warning" days of the settings. */
	nearExpiry: boolean;
	/** Has units past their expiry. */
	expired: boolean;
};

/** A product with its photo (MUN-11) and stock (MUN-12/13). */
export type ProductListItem = Product & {
	photoUri: string | null;
	/** Units in stock, expired included until they're discarded. */
	stock: number;
	/** Units that can be sold (not expired). */
	sellableStock: number;
	averageCost: Money;
	/** stock × average cost. */
	stockValue: Money;
	flags: StockFlags;
};

export type ProductListPage = Page<ProductListItem> & {
	/** Value of the whole stock of the active products, regardless of the filters. */
	totalStockValue: Money;
};

/** Units in stock with the same expiry (`null`: no expiry). Lots stay hidden from the user. */
export type ExpiryBalance = {
	expiry: ExpiryMonth | null;
	quantity: number;
	expired: boolean;
	nearExpiry: boolean;
};

export type MovementType =
	| "purchase"
	| "purchase_canceled"
	| "sale"
	| "sale_canceled"
	| "adjustment"
	| "cost_correction";

export type AdjustmentReason =
	| "count"
	| "damage"
	| "loss"
	| "expired_discarded"
	| "gift_internal_use"
	| "other";

/** Reasons that can add units: losses, damage, discards and gifts only make sense going down (estoque.md). */
export const INCREASE_REASONS: readonly AdjustmentReason[] = ["count", "other"];

/** Stock ledger entry: never changes once written (docs/product/estoque.md). */
export type Movement = {
	id: string;
	type: MovementType;
	/** Signed change in units (0 for a cost correction). */
	quantity: number;
	unitCost: Money;
	averageCostAfter: Money;
	stockAfter: number;
	reason: AdjustmentReason | null;
	note: string | null;
	/** Purchase or sale that caused it, to open from the history. */
	origin: { kind: "purchase" | "sale"; id: string; number: number } | null;
	createdAt: string;
	author: string;
};

export type ProductDetail = ProductListItem & {
	expiries: ExpiryBalance[];
};

export type StockAdjustmentInput = {
	newQuantity: number;
	reason: AdjustmentReason;
	note: string | null;
	/** Reducing with more than one expiry: where the units left from (`null`: units without expiry). */
	fromExpiry?: ExpiryMonth | null;
	/** Increasing a product with expiry: expiry of the new units. */
	expiry: ExpiryMonth | null;
};

export type CostCorrectionInput = { newCost: Money; note: string };
