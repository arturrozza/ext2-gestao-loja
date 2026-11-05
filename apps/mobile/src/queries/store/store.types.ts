import type { Percent } from "@/lib/money";

/** Store data (docs/product/acesso-e-loja.md). */
export type StoreProfile = {
	name: string;
	document: string | null;
	phone: string | null;
	address: string | null;
};

/** Store settings: sale defaults and alert thresholds (acesso-e-loja.md, alertas.md). */
export type StoreSettings = {
	defaultTaxPercent: Percent;
	mercadoLivreFeePercent: Percent;
	/** "Perto de vencer" when this many days or fewer are left. */
	expiryWarningDays: number;
	/**
	 * Analysis window in days: "Produto parado" after this many days without a sale, and "Margem baixa/negativa" over
	 * the sales of these days (alertas.md uses 60 for both).
	 */
	staleProductDays: number;
	/** "Margem baixa" under this percentage. */
	lowMarginPercent: Percent;
};
