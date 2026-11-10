import type { Percent } from "@/lib/money";

/** Store data (docs/product/loja.md). */
export type StoreProfile = {
	name: string;
	document: string | null;
	phone: string | null;
	address: string | null;
};

/** Store settings: sale defaults and the expiry warning (loja.md, alertas.md). */
export type StoreSettings = {
	defaultTaxPercent: Percent;
	mercadoLivreFeePercent: Percent;
	/** "Perto de vencer" when this many days or fewer are left. */
	expiryWarningDays: number;
};
