/**
 * Real profit of a sale (docs/product/vendas.md, "Lucro real"). Used by the new-sale preview;
 * the API computes and stores it for real. All values in cents.
 *
 *   receita          = soma de (quantidade × preço) − desconto + acréscimo
 *   custo percentual = receita × percentual
 *   lucro real       = receita − custo dos produtos − custos da venda
 *   margem           = lucro real ÷ receita
 *
 * The discount counts once, in the revenue.
 */
import { percentOf } from "@/lib/money";

export type SaleMathInput = {
	items: { quantity: number; unitPriceCents: number; unitCostCents: number }[];
	discountCents: number;
	surchargeCents: number;
	costs: { mode: "amount" | "percent"; value: number }[];
};

export type SaleMath = {
	grossCents: number;
	revenueCents: number;
	productsCostCents: number;
	/** Amount of each cost, in the same order as the input. */
	costAmountsCents: number[];
	saleCostsCents: number;
	profitCents: number;
	/** `null` when the revenue is zero. */
	margin: number | null;
};

export function computeSale(input: SaleMathInput): SaleMath {
	const grossCents = input.items.reduce(
		(sum, item) => sum + item.quantity * item.unitPriceCents,
		0,
	);
	const revenueCents = grossCents - input.discountCents + input.surchargeCents;
	const productsCostCents = input.items.reduce(
		(sum, item) => sum + item.quantity * item.unitCostCents,
		0,
	);
	const costAmountsCents = input.costs.map((cost) =>
		cost.mode === "percent" ? percentOf(revenueCents, cost.value) : cost.value,
	);
	const saleCostsCents = costAmountsCents.reduce(
		(sum, value) => sum + value,
		0,
	);
	const profitCents = revenueCents - productsCostCents - saleCostsCents;
	return {
		grossCents,
		revenueCents,
		productsCostCents,
		costAmountsCents,
		saleCostsCents,
		profitCents,
		margin: revenueCents > 0 ? profitCents / revenueCents : null,
	};
}
