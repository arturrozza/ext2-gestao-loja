import { nextDraftKey } from "@/lib/draft-key";
import { type Percent, percentToInput } from "@/lib/money";
import type { Reseller } from "@/queries/resellers/resellers.types";
import type { SaleChannel, SaleCostKind } from "@/queries/sales/sales.types";
import type { StoreSettings } from "@/queries/store/store.types";
import type { SaleCostDraft } from "../new-sale.schema";

function percentCost(kind: SaleCostKind, percent: Percent): SaleCostDraft {
	return {
		key: nextDraftKey(),
		kind,
		mode: "percent",
		value: percentToInput(percent),
		label: "",
		auto: true,
	};
}

export function manualCost(kind: SaleCostKind): SaleCostDraft {
	return {
		key: nextDraftKey(),
		kind,
		mode: "amount",
		value: "",
		label: "",
		auto: false,
	};
}

/** Costs a new sale starts with: the default tax (vendas.md), when the store has one. */
export function initialCosts(settings: StoreSettings): SaleCostDraft[] {
	return settings.defaultTaxPercent > 0
		? [percentCost("tax", settings.defaultTaxPercent)]
		: [];
}

/**
 * Swaps the suggested channel costs when the channel or the reseller changes: Mercado Livre fee on that channel,
 * commission on the reseller channel (revendedoras.md). Everything else the user has stays.
 */
export function withChannelCosts(
	costs: SaleCostDraft[],
	channel: SaleChannel,
	settings: StoreSettings,
	reseller: Pick<Reseller, "defaultCommission"> | null,
): SaleCostDraft[] {
	const kept = costs.filter(
		(cost) =>
			!cost.auto ||
			(cost.kind !== "platform_fee" && cost.kind !== "commission"),
	);
	if (channel === "mercado_livre" && settings.mercadoLivreFeePercent > 0) {
		return [
			...kept,
			percentCost("platform_fee", settings.mercadoLivreFeePercent),
		];
	}
	if (channel === "reseller" && reseller) {
		return [...kept, percentCost("commission", reseller.defaultCommission)];
	}
	return kept;
}
