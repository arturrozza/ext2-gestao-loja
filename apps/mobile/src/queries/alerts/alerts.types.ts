import type { Page } from "@/queries/pagination";

export type AlertKind =
	| "out_of_stock"
	| "low_stock"
	| "expired"
	| "near_expiry"
	| "negative_margin"
	| "low_margin"
	| "stale";

export type AlertGroup = "stock" | "expiry" | "margin" | "stale";

export type Alert = {
	id: string;
	kind: AlertKind;
	productId: string;
	productName: string;
	/** "2 em estoque, mínimo 5". */
	detail: string;
};

/** `groups`: any of these; empty means every alert. */
export type AlertListFilters = { groups: AlertGroup[] };

/** `counts`: alerts of each kind under the filter, across all pages. */
export type AlertPage = Page<Alert> & {
	counts: Partial<Record<AlertKind, number>>;
};
