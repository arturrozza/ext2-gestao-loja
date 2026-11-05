import type { ISODate } from "@/lib/dates";
import type { Money } from "@/lib/money";
import type { Page } from "@/queries/pagination";

/** A regular customer of the store (docs/product/clientes.md). */
export type Customer = {
	id: string;
	name: string;
	phone: string | null;
	note: string | null;
	archived: boolean;
	/** Active (not canceled) sales only. */
	purchasesCount: number;
	totalSpent: Money;
	lastPurchaseAt: ISODate | null;
};

export type CustomerPage = Page<Customer>;

export type CustomerListFilters = { search: string; archived: boolean };

export type CustomerInput = {
	name: string;
	phone: string | null;
	note: string | null;
};
