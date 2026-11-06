import type { ExpiryMonth, ISODate } from "@/lib/dates";
import type { Money } from "@/lib/money";
import type { Page } from "@/queries/pagination";
import type { ItemPreview } from "@/queries/products/products.types";

export type PurchaseStatus = "active" | "canceled";

export type PurchaseListFilters = { status: PurchaseStatus | null };

export type PurchaseSummary = {
	id: string;
	number: number;
	date: ISODate;
	status: PurchaseStatus;
	itemCount: number;
	unitCount: number;
	total: Money;
	/** "Perfume Floral, Hidratante e mais 2". */
	description: string;
	/** First products, for the thumbs of the row. */
	preview: ItemPreview[];
	/** Distinct products in it. */
	productCount: number;
};

export type PurchasePage = Page<PurchaseSummary>;

export type PurchaseItem = {
	id: string;
	productId: string;
	productName: string;
	photoUrl: string | null;
	quantity: number;
	unitCost: Money;
	total: Money;
	expiry: ExpiryMonth | null;
};

export type PurchaseDetail = PurchaseSummary & {
	note: string | null;
	items: PurchaseItem[];
	createdAt: string;
	author: string;
	canceledAt: string | null;
	/** Why it can't be canceled (units already sold), or `null` when it can. */
	cancelBlockedReason: string | null;
};

/** A purchase as the user enters it (compras.md). No edit: a wrong one is canceled and entered again. */
export type PurchaseInput = {
	date: ISODate;
	note: string | null;
	items: {
		productId: string;
		quantity: number;
		unitCost: Money;
		/** Required when the product has expiry. */
		expiry: ExpiryMonth | null;
	}[];
};
