import type { StockFlags } from "@/queries/products/products.types";

export type StockStatus = { label: string; tone: "danger" | "highlight" };

/**
 * The most urgent stock state of a product, or `null` when there's nothing to say: no stock, expired units (they still
 * count until discarded), low, then near expiry.
 */
export function stockStatus(flags: StockFlags): StockStatus | null {
	if (flags.outOfStock) return { label: "Sem estoque", tone: "danger" };
	if (flags.expired) return { label: "Vencido", tone: "danger" };
	if (flags.lowStock) return { label: "Estoque baixo", tone: "highlight" };
	if (flags.nearExpiry) return { label: "Perto de vencer", tone: "highlight" };
	return null;
}
