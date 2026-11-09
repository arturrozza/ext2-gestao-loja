import type { Money, Percent } from "@/lib/money";

/**
 * A reseller as the API sends it. A record, not a user: she doesn't access the app (docs/product/revendedoras.md). The
 * name may repeat.
 */
export type Reseller = {
	id: string;
	name: string;
	/** Digits only ("11999998888"); shown with `formatPhone`. */
	phone: string | null;
	/** Suggested on each sale on the reseller channel, editable there. */
	defaultCommission: Percent;
	note: string | null;
	archived: boolean;
	/** Active (not canceled) sales only: of the period asked for on her page, of all time in the list. */
	salesCount: number;
	salesTotal: Money;
	commissionTotal: Money;
};

export type ResellerListFilters = { search: string; archived: boolean };

export type ResellerInput = {
	name: string;
	phone: string | null;
	defaultCommission: Percent;
	note: string | null;
};
