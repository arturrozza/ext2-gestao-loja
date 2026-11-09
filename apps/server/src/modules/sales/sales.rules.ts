import { addDays, dayProblem, type ISODate, monthOf } from "../../lib/dates";
import { httpError } from "../../lib/http-error";
import { MAX_CENTS, percentOf } from "../../lib/money";
import type { LockedProduct } from "../products/products.lock";
import {
	EMPTY_STOCK,
	planSaleExit,
	type SaleExitPlan,
	type SellableLot,
	type StockBalance,
} from "../stock/stock.rules";
import type { SalePeriod, SalesModel } from "./sales.model";

/*
 * Sales (docs/product/vendas.md): pure rules, so the service only reads, plans and records. Every refusal is a 422 on
 * the field to fix.
 */

type Body = SalesModel["body"];
type ItemInput = Body["items"][number];

const invalid = (field: string | undefined, message: string, code: string) =>
	httpError(422, { code, message, ...(field ? { field } : {}) });

/** The day of a sale can be any day up to today (the store's day). */
export function assertSaleDate(date: ISODate, today: ISODate): void {
	const problem = dayProblem(date, today);
	if (problem === "future") {
		throw invalid(
			"date",
			"A data da venda não pode ser no futuro.",
			"validation",
		);
	}
	if (problem) throw invalid("date", "Confira a data da venda.", "validation");
}

/** The reseller goes with the reseller channel, and only with it (revendedoras.md). */
export function assertChannel({ channel, resellerId }: Body): void {
	if (channel === "reseller" && !resellerId) {
		throw invalid("resellerId", "Escolha a revendedora.", "validation");
	}
	if (channel !== "reseller" && resellerId) {
		throw invalid(
			"resellerId",
			"Revendedora só vai no canal Revendedora.",
			"validation",
		);
	}
}

/** A customer or reseller of the sale as read under a lock: not the store's, archived, or active. */
export type PartyState = "missing" | "archived" | "active";

const PARTY_ERRORS = {
	customerId: {
		missing: { code: "customer_not_found", message: "Cliente não encontrado." },
		archived: {
			code: "customer_archived",
			message: "Cliente arquivado. Reative para vender.",
		},
	},
	resellerId: {
		missing: {
			code: "reseller_not_found",
			message: "Revendedora não encontrada.",
		},
		archived: {
			code: "reseller_archived",
			message: "Revendedora arquivada. Reative para vender.",
		},
	},
} as const;

/** Only active customers and resellers go into a new sale (clientes.md, revendedoras.md). */
export function assertParty(
	field: keyof typeof PARTY_ERRORS,
	state: PartyState,
): void {
	if (state === "active") return;
	const { code, message } = PARTY_ERRORS[field][state];
	throw invalid(field, message, code);
}

/** One line per product: more units go in its quantity. */
export function assertUniqueProducts(items: ItemInput[]): void {
	const seen = new Set<string>();
	items.forEach((item, index) => {
		if (seen.has(item.productId)) {
			throw invalid(
				`items.${index}.productId`,
				"Esse produto já está na venda. Aumente a quantidade.",
				"duplicate_product",
			);
		}
		seen.add(item.productId);
	});
}

/** Every line against its product (locked by the caller): an active product of the store. */
export function assertItems(
	items: ItemInput[],
	productsById: Map<string, LockedProduct>,
): void {
	items.forEach((item, index) => {
		const field = `items.${index}.productId`;
		const product = productsById.get(item.productId);
		if (!product) {
			throw invalid(field, "Produto não encontrado.", "product_not_found");
		}
		if (product.archived) {
			throw invalid(
				field,
				`${product.name} está arquivado. Reative ele para vender.`,
				"product_archived",
			);
		}
	});
}

/** A sale line with where its units leave from (`planSaleExit`) and what it keeps of that. */
export type PlannedLine = ItemInput & {
	plan: SaleExitPlan;
	/** The average cost when the sale was entered, rounded to the cent. */
	unitCost: number;
	/** What left the stock with the units. */
	cost: number;
};

/**
 * Where every line's units leave from (estoque.md, "Saída na venda"). A line with more units than the product can sell
 * blocks the whole sale with what's available (vendas.md, "Estoque insuficiente"). One line per product
 * (`assertItems`), so each plans against its product's own balance.
 */
export function planLines(
	items: ItemInput[],
	balances: ReadonlyMap<string, StockBalance>,
	lots: ReadonlyMap<string, SellableLot[]>,
): PlannedLine[] {
	return items.map((item, index) => {
		const productLots = lots.get(item.productId) ?? [];
		const balance = balances.get(item.productId) ?? EMPTY_STOCK;
		const plan = planSaleExit(balance, productLots, item.quantity);
		if (!plan) {
			const available = productLots.reduce((sum, lot) => sum + lot.quantity, 0);
			throw invalid(
				`items.${index}.quantity`,
				`Estoque insuficiente: disponível ${available}.`,
				"insufficient_stock",
			);
		}
		return {
			...item,
			plan,
			unitCost: plan.movement.unitCost,
			cost: -plan.movement.valueChange,
		};
	});
}

/** The numbers of a sale (vendas.md, "Lucro real"), all in cents, with the amount of each cost. */
export type SaleTotals<C> = {
	revenue: number;
	productsCost: number;
	saleCosts: number;
	profit: number;
	costs: (C & { amount: number })[];
};

const saleLimit = () =>
	invalid(
		undefined,
		"O valor da venda passa do limite que o sistema guarda.",
		"sale_limit",
	);

/**
 * The most Σ quantity × price can be and still leave a revenue a sale keeps: `MAX_CENTS` after a discount of at most
 * `MAX_CENTS`.
 */
const MAX_GROSS = 2 * MAX_CENTS;

/** Σ quantity × price, refused once it passes `MAX_GROSS`: stopping there keeps the sum a safe integer. */
function grossOf(items: { quantity: number; unitPrice: number }[]): number {
	let gross = 0;
	for (const item of items) {
		gross += item.quantity * item.unitPrice;
		if (gross > MAX_GROSS) throw saleLimit();
	}
	return gross;
}

/**
 * The real profit (vendas.md):
 *
 *   receita          = Σ (quantidade × preço) − desconto + acréscimo
 *   custo percentual = receita × percentual
 *   lucro real       = receita − custo dos produtos − custos da venda
 *
 * The discount counts once, in the revenue, and can't take it below zero. Each percentage is rounded to the cent.
 */
export function computeTotals<
	C extends { mode: "amount" | "percent"; value: number },
>(input: {
	lines: { quantity: number; unitPrice: number; cost: number }[];
	discount: number;
	surcharge: number;
	costs: C[];
}): SaleTotals<C> {
	const gross = grossOf(input.lines);
	if (input.discount > gross) {
		throw invalid(
			"discount",
			"O desconto é maior que o valor da venda.",
			"validation",
		);
	}
	const revenue = gross - input.discount + input.surcharge;
	if (revenue > MAX_CENTS) throw saleLimit();
	const costs = input.costs.map((cost) => ({
		...cost,
		amount:
			cost.mode === "percent" ? percentOf(revenue, cost.value) : cost.value,
	}));
	const productsCost = input.lines.reduce((sum, line) => sum + line.cost, 0);
	const saleCosts = costs.reduce((sum, cost) => sum + cost.amount, 0);
	return {
		revenue,
		productsCost,
		saleCosts,
		profit: revenue - productsCost - saleCosts,
		costs,
	};
}

/** The first day of a list's period on `today` (the store's day), or `null` for every sale. */
export function periodStart(
	period: SalePeriod,
	today: ISODate,
): ISODate | null {
	if (period === "today") return today;
	if (period === "7d") return addDays(today, -6);
	if (period === "month") return `${monthOf(today)}-01`;
	return null;
}

/** Profit ÷ revenue; `null` without revenue (a sale fully discounted). */
export function marginOf(profit: number, revenue: number): number | null {
	return revenue > 0 ? profit / revenue : null;
}
