import type { ISODate } from "@/lib/dates";
import type { Money } from "@/lib/money";

/** A regular customer of the store as the API sends it (docs/product/clientes.md). The name may repeat. */
export type Customer = {
	id: string;
	name: string;
	/** Digits only ("11999998888"); shown with `formatPhone`. */
	phone: string | null;
	note: string | null;
	archived: boolean;
	/** Active (not canceled) sales only. */
	purchasesCount: number;
	totalSpent: Money;
	lastPurchaseAt: ISODate | null;
};

export type CustomerListFilters = { search: string; archived: boolean };

export type CustomerInput = {
	name: string;
	phone: string | null;
	note: string | null;
};
