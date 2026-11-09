import type { QuantityFlags } from "@/queries/products/products.types";

export type StockStatus = { label: string; tone: "danger" | "highlight" };

/**
 * The most urgent stock state of a product, or `null` when there's nothing to say. Order follows
 * docs/product/alertas.md: no stock, then low. The expiry states join with the stock screen (MUN-13); until then a
 * product with only expired units shows no state.
 */
export function stockStatus(flags: QuantityFlags): StockStatus | null {
	if (flags.outOfStock) return { label: "Sem estoque", tone: "danger" };
	if (flags.lowStock) return { label: "Estoque baixo", tone: "highlight" };
	return null;
}
