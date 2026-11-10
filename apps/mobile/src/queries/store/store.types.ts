import type { Percent } from "@/lib/money";

/** Store data (docs/product/acesso-e-loja.md). */
export type StoreProfile = {
	name: string;
	document: string | null;
	phone: string | null;
	address: string | null;
};

/** Store settings: sale defaults and the expiry warning (acesso-e-loja.md, alertas.md). */
export type StoreSettings = {
	defaultTaxPercent: Percent;
	mercadoLivreFeePercent: Percent;
	/** "Perto de vencer" when this many days or fewer are left. */
	expiryWarningDays: number;
	/** Unused since the margin and stale product alerts left (docs/decisions.md, MUN-18); kept as saved. */
	staleProductDays: number;
	/** Unused, like `staleProductDays`. */
	lowMarginPercent: Percent;
};
