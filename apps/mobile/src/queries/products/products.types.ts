import type { ExpiryMonth } from "@/lib/dates";
import type { Money } from "@/lib/money";
import type { Page } from "@/queries/pagination";

/** The stock states of a product (estoque.md). */
export type StockFlags = {
	/** Quantity at or below the minimum (and not zero). */
	lowStock: boolean;
	outOfStock: boolean;
	/** Has units within the "expiry warning" days of the settings. */
	nearExpiry: boolean;
	/** Has units past their expiry, still counted until discarded. */
	expired: boolean;
};

/**
 * A product as the API sends it (docs/product/produtos.md), with its stock read from the ledger (estoque.md). Stock
 * and cost are never typed in: they come from purchases.
 */
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
	/** Public address of the photo; null without one (the thumb shows the initials). */
	photoUrl: string | null;
	archived: boolean;
	/** Units in stock, expired included until they're discarded. */
	stock: number;
	/** Units that can be sold (not expired). */
	sellableStock: number;
	/** stock value ÷ units, rounded to the cent. */
	averageCost: Money;
	stockValue: Money;
	flags: StockFlags;
};

/** Stock states the product list filters by: any of them (estoque.md). */
export type StockState = "in_stock" | "low" | "out" | "near_expiry" | "expired";

export type ProductListFilters = {
	/** Name, internal code or barcode. */
	search: string;
	/** Any of these; empty means every category. */
	categoryIds: string[];
	/** `true` lists only archived products; `false` only active ones. */
	archived: boolean;
	/** Any of these states; empty means every product. */
	stock: StockState[];
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
	/** A key `POST /products/photos` gave back; `null` removes the photo; left out keeps it. */
	photoKey?: string | null;
};

/** The photo part of a product save: left out keeps it, `null` removes it, `{ uri }` is a new local photo to send. */
export type PhotoChange = { uri: string } | null | undefined;

/** What the product form saves: the API input, with the photo still a local file until it is sent. */
export type ProductSave = Omit<ProductInput, "photoKey"> & {
	photo: PhotoChange;
};

/** Store category: just a name (produtos.md). Archived ones keep their products but can't be picked. */
export type Category = {
	id: string;
	name: string;
	archived: boolean;
	/** Active products in it. */
	productCount: number;
};

/** A product shown as a thumb in a sale or purchase row. */
export type ItemPreview = {
	productId: string;
	name: string;
	photoUrl: string | null;
};

/* Stock (estoque.md): quantity by expiry, the ledger, adjustments and cost corrections. */

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
	/** The purchase that caused it, to open from the history (sales join when they exist). */
	origin: { kind: "purchase"; id: string; number: number } | null;
	createdAt: string;
	author: string;
};

/** A product on its own screen: with its units by expiry, soonest first. */
export type ProductDetail = Product & {
	expiries: ExpiryBalance[];
};

export type StockAdjustmentInput = {
	newQuantity: number;
	reason: AdjustmentReason;
	note: string | null;
	/** Reducing with more than one expiry: where the units left from (`null`: units without expiry). */
	fromExpiry?: ExpiryMonth | null;
	/** Increasing a product with expiry: expiry of the new units (a past month too: found expired). */
	expiry: ExpiryMonth | null;
};

export type CostCorrectionInput = { newCost: Money; note: string };
