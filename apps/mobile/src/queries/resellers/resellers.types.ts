import type { Money, Percent } from "@/lib/money";

/** A reseller is a record, not a user: she doesn't access the app (docs/product/revendedoras.md). */
export type Reseller = {
	id: string;
	name: string;
	phone: string | null;
	/** Suggested on each sale on the reseller channel, editable there. */
	defaultCommission: Percent;
	note: string | null;
	archived: boolean;
	/** Active (not canceled) sales only. */
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
