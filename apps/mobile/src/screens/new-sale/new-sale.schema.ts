import { z } from "zod";
import { parseDateInput, todayISODate } from "@/lib/dates";
import { fromCents, parseMoneyInput, parsePercentInput } from "@/lib/money";
import type { Reseller } from "@/queries/resellers/resellers.types";
import type {
	PaymentCondition,
	PaymentMethod,
	SaleChannel,
	SaleCostInput,
	SaleCostKind,
} from "@/queries/sales/sales.types";

export type SaleItemDraft = {
	key: string;
	product: { id: string; name: string; photoUri: string | null };
	quantity: number;
	unitPrice: string;
};

/** Units missing for a line (0 when there's enough, or while the live stock isn't known). */
export function shortage(
	item: SaleItemDraft,
	product: { sellableStock: number } | undefined,
): number {
	return product ? Math.max(0, item.quantity - product.sellableStock) : 0;
}

export type SaleCostDraft = {
	key: string;
	kind: SaleCostKind;
	mode: "amount" | "percent";
	value: string;
	label: string;
	/** Suggested by the app (tax, Mercado Livre fee, commission). Replaced when the channel or reseller changes. */
	auto: boolean;
};

/** The reseller as the sale form keeps her. */
export type SaleReseller = Pick<Reseller, "id" | "name" | "defaultCommission">;

export type SaleAdjustment = "none" | "discount" | "surcharge";

export type SaleFormValues = {
	date: string;
	channel: SaleChannel;
	/** Who sold, on the reseller channel. Kept whole (not just the id) so the field and her commission need no lookup. */
	reseller: SaleReseller | null;
	items: SaleItemDraft[];
	adjustment: SaleAdjustment;
	adjustmentValue: string;
	costs: SaleCostDraft[];
	paymentCondition: PaymentCondition;
	paymentMethod: PaymentMethod | undefined;
	customer: { id: string; name: string } | null;
};

type Ctx = z.RefinementCtx;

function fail(ctx: Ctx, path: (string | number)[], message: string) {
	ctx.addIssue({ code: "custom", path, message });
}

/** Cost in the shape the API takes, or `null` (with an issue) when its value is invalid. */
function parseCost(
	cost: SaleCostDraft,
	index: number,
	ctx: Ctx,
): SaleCostInput | null {
	const path = ["costs", index, "value"];
	if (cost.mode === "percent") {
		const percent = parsePercentInput(cost.value);
		if (percent === null || percent > 100) {
			fail(ctx, path, "Percentual entre 0 e 100.");
			return null;
		}
		return {
			kind: cost.kind,
			mode: "percent",
			value: String(percent),
			label: cost.label.trim() || null,
		};
	}
	const cents = parseMoneyInput(cost.value);
	if (cents === null) {
		fail(ctx, path, "Informe o valor.");
		return null;
	}
	return {
		kind: cost.kind,
		mode: "amount",
		value: fromCents(cents),
		label: cost.label.trim() || null,
	};
}

function parseItem(item: SaleItemDraft, index: number, ctx: Ctx) {
	const cents = parseMoneyInput(item.unitPrice);
	if (cents === null)
		fail(ctx, ["items", index, "unitPrice"], "Informe o preço.");
	if (item.quantity < 1)
		fail(ctx, ["items", index, "quantity"], "Quantidade maior que zero.");
	if (cents === null || item.quantity < 1) return null;
	return {
		productId: item.product.id,
		quantity: item.quantity,
		unitPrice: fromCents(cents),
	};
}

function parseDate(text: string, ctx: Ctx) {
	const date = parseDateInput(text);
	if (!date) {
		fail(ctx, ["date"], "Data inválida (dd/mm/aaaa).");
		return null;
	}
	if (date > todayISODate()) {
		fail(ctx, ["date"], "A data da venda não pode ser futura.");
		return null;
	}
	return date;
}

function parseAdjustment(values: SaleFormValues, ctx: Ctx) {
	if (values.adjustment === "none") return 0;
	const cents = parseMoneyInput(values.adjustmentValue);
	if (cents === null || cents === 0) {
		fail(ctx, ["adjustmentValue"], "Informe o valor.");
		return null;
	}
	return cents;
}

/** The discount can't take the sale below zero. */
function checkDiscount(values: SaleFormValues, cents: number | null, ctx: Ctx) {
	if (values.adjustment !== "discount" || cents === null) return;
	const gross = values.items.reduce(
		(sum, item) => sum + item.quantity * (parseMoneyInput(item.unitPrice) ?? 0),
		0,
	);
	if (cents > gross)
		fail(ctx, ["adjustmentValue"], "O desconto é maior que o valor da venda.");
}

function checkRequired(values: SaleFormValues, ctx: Ctx) {
	if (values.items.length === 0)
		fail(ctx, ["items"], "Adicione pelo menos um produto.");
	if (values.channel === "reseller" && !values.reseller)
		fail(ctx, ["resellerId"], "Escolha a revendedora.");
	if (!values.paymentMethod)
		fail(ctx, ["paymentMethod"], "Escolha a forma de pagamento.");
}

/** New sale form → API input. All money/percent text is parsed here; the rules follow docs/product/vendas.md. */
export const newSaleSchema = z
	.custom<SaleFormValues>()
	.transform((values, ctx) => {
		checkRequired(values, ctx);
		const date = parseDate(values.date, ctx);
		const adjustment = parseAdjustment(values, ctx);
		checkDiscount(values, adjustment, ctx);
		const items = values.items.map((item, index) =>
			parseItem(item, index, ctx),
		);
		const costs = values.costs.map((cost, index) =>
			parseCost(cost, index, ctx),
		);
		if (
			ctx.issues.length > 0 ||
			!date ||
			adjustment === null ||
			!values.paymentMethod
		)
			return z.NEVER;
		return {
			date,
			channel: values.channel,
			items: items.filter((item) => item !== null),
			discount: fromCents(values.adjustment === "discount" ? adjustment : 0),
			surcharge: fromCents(values.adjustment === "surcharge" ? adjustment : 0),
			costs: costs.filter((cost) => cost !== null),
			paymentCondition: values.paymentCondition,
			paymentMethod: values.paymentMethod,
			customerId: values.customer?.id ?? null,
			resellerId:
				values.channel === "reseller" ? (values.reseller?.id ?? null) : null,
		};
	});
