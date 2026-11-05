import { router } from "expo-router";
import { showToast } from "@/components/toast";
import { formatDate, todayISODate } from "@/lib/dates";
import { nextDraftKey } from "@/lib/draft-key";
import { SALE_COST_KINDS } from "@/lib/labels";
import {
	moneyToInput,
	parseMoneyInput,
	parsePercentInput,
	toCents,
} from "@/lib/money";
import { computeSale } from "@/lib/sale-math";
import { useZodForm } from "@/lib/use-zod-form";
import type {
	ProductDetail,
	ProductListItem,
} from "@/queries/products/products.types";
import { useProductsById } from "@/queries/products/use-products";
import type { SaleChannel } from "@/queries/sales/sales.types";
import { useCreateSale } from "@/queries/sales/use-sales";
import type { StoreSettings } from "@/queries/store/store.types";
import {
	newSaleSchema,
	type SaleCostDraft,
	type SaleFormValues,
	type SaleItemDraft,
	type SaleReseller,
	shortage,
} from "./new-sale.schema";
import { initialCosts, withChannelCosts } from "./partials/sale-costs";

function draftFor(product: ProductListItem): SaleItemDraft {
	return {
		key: nextDraftKey(),
		product: {
			id: product.id,
			name: product.name,
			photoUri: product.photoUri,
		},
		quantity: 1,
		unitPrice: moneyToInput(product.basePrice),
	};
}

function costValue(cost: SaleCostDraft) {
	const parsed =
		cost.mode === "percent"
			? parsePercentInput(cost.value)
			: parseMoneyInput(cost.value);
	return parsed ?? 0;
}

/** Live numbers of the sale. Invalid fields count as zero until they're fixed. */
function liveBreakdown(
	values: SaleFormValues,
	products: Map<string, ProductDetail>,
) {
	const adjustment = parseMoneyInput(values.adjustmentValue) ?? 0;
	const discountCents = values.adjustment === "discount" ? adjustment : 0;
	const surchargeCents = values.adjustment === "surcharge" ? adjustment : 0;
	const math = computeSale({
		items: values.items.map((item) => {
			const product = products.get(item.product.id);
			return {
				quantity: item.quantity,
				unitPriceCents: parseMoneyInput(item.unitPrice) ?? 0,
				unitCostCents: product ? toCents(product.averageCost) : 0,
			};
		}),
		discountCents,
		surchargeCents,
		costs: values.costs.map((cost) => ({
			mode: cost.mode,
			value: costValue(cost),
		})),
	});
	return {
		...math,
		discountCents,
		surchargeCents,
		costs: values.costs.map((cost, index) => ({
			key: cost.key,
			label: cost.label.trim() || SALE_COST_KINDS[cost.kind],
			amountCents: math.costAmountsCents[index] ?? 0,
		})),
	};
}

/** Why the sale can't go yet: stock short, or a line whose stock couldn't be checked (still loading or failed). */
function stockState(
	items: SaleItemDraft[],
	products: Map<string, ProductDetail>,
) {
	const unknown = items.some((item) => !products.has(item.product.id));
	const short = items.some(
		(item) => shortage(item, products.get(item.product.id)) > 0,
	);
	return { short, unknown };
}

/** State and rules of the new sale screen. */
export function useNewSaleForm(settings: StoreSettings) {
	const create = useCreateSale();
	const form = useZodForm(newSaleSchema, {
		date: formatDate(todayISODate()),
		channel: "store",
		reseller: null,
		items: [],
		adjustment: "none",
		adjustmentValue: "",
		costs: initialCosts(settings),
		paymentCondition: "cash",
		paymentMethod: undefined,
		customer: null,
	} satisfies SaleFormValues);
	const { values } = form;
	const products = useProductsById(values.items.map((item) => item.product.id));
	const stock = stockState(values.items, products);

	const updateItems = (change: (items: SaleItemDraft[]) => SaleItemDraft[]) =>
		form.setValues((current) => ({ ...current, items: change(current.items) }));
	const updateCosts = (change: (costs: SaleCostDraft[]) => SaleCostDraft[]) =>
		form.setValues((current) => ({ ...current, costs: change(current.costs) }));

	/** Swaps the suggested costs. Choosing what's already selected keeps the user's edits. */
	const setChannel = (channel: SaleChannel, reseller: SaleReseller | null) => {
		if (channel === values.channel && reseller?.id === values.reseller?.id)
			return;
		form.setValues((current) => ({
			...current,
			channel,
			reseller,
			costs: withChannelCosts(current.costs, channel, settings, reseller),
		}));
	};

	const submit = form.handleSubmit((data) => {
		if (stock.short || stock.unknown || create.isPending) return;
		create.mutate(data, {
			onSuccess: (sale) => {
				showToast("Venda registrada");
				router.replace(`/sales/${sale.id}`);
			},
			onError: form.applyApiError,
		});
	});

	return {
		form,
		create,
		products,
		stock,
		breakdown: liveBreakdown(values, products),
		updateItems,
		updateCosts,
		setChannel,
		addProducts: (picked: ProductListItem[]) =>
			updateItems((all) => [...all, ...picked.map(draftFor)]),
		submit,
	};
}
