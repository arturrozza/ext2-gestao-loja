import type { TProperties } from "@sinclair/typebox";
import { t, type UnwrapSchema } from "elysia";
import {
	dayField,
	idField,
	moneyField,
	nonNegativeMoneyTotalField,
	optionalText,
	percentField,
	signedMoneyTotalField,
	unitsField,
} from "../../lib/fields";
import { cursorQuery, pageOf } from "../../lib/pagination";
import { previewField } from "../../lib/preview";

/** Most lines one sale takes. */
const MAX_SALE_ITEMS = 100;

/** Most costs one sale takes. */
const MAX_SALE_COSTS = 20;

const CHANNELS = ["store", "mercado_livre", "reseller"] as const;

const channel = t.UnionEnum(CHANNELS);

const paymentCondition = t.Union([t.Literal("cash"), t.Literal("term")]);

const paymentMethod = t.Union([
	t.Literal("pix"),
	t.Literal("cash"),
	t.Literal("credit"),
	t.Literal("debit"),
]);

const costKind = t.Union([
	t.Literal("freight"),
	t.Literal("tax"),
	t.Literal("platform_fee"),
	t.Literal("commission"),
	t.Literal("other"),
]);

/**
 * A cost by its mode: cents in reais (`amount`), or basis points of the revenue (`percent`, up to 100%). `fields` are
 * the others the cost carries (the input's label, or the stored cost's id, label and amount).
 */
const costOf = <F extends TProperties>(fields: F) =>
	t.Union([
		t.Object({
			kind: costKind,
			mode: t.Literal("amount"),
			value: moneyField,
			...fields,
		}),
		t.Object({
			kind: costKind,
			mode: t.Literal("percent"),
			value: percentField,
			...fields,
		}),
	]);

const status = t.Union([t.Literal("active"), t.Literal("canceled")]);

/** A sale in a list. */
const summary = t.Object({
	id: t.String(),
	/** "Venda #12". */
	number: t.Integer(),
	/** "2026-11-09": the day the user said. */
	date: t.String(),
	/** When it was entered (ISO). */
	createdAt: t.String(),
	channel,
	status,
	customerName: t.Union([t.Null(), t.String()]),
	resellerName: t.Union([t.Null(), t.String()]),
	/** In cents: with the discount and the surcharge. */
	revenue: nonNegativeMoneyTotalField,
	/** In cents: the real profit; negative is a loss. */
	profit: signedMoneyTotalField,
	/** Distinct products in it. */
	productCount: t.Integer(),
	/** The first products, in the order they were entered. */
	preview: t.Array(previewField),
});

const item = t.Object({
	id: t.String(),
	productId: t.String(),
	productName: t.String(),
	photoUrl: t.Union([t.Null(), t.String()]),
	quantity: t.Integer(),
	/** In cents. */
	unitPrice: moneyField,
	/** In cents: the average cost when the sale was entered. Never changes. */
	unitCost: moneyField,
	/** In cents: quantity × price. */
	total: nonNegativeMoneyTotalField,
});

const cost = costOf({
	id: t.String(),
	label: t.Union([t.Null(), t.String()]),
	/** In cents: what it came to (a percentage is of the revenue). */
	amount: moneyField,
});

const detail = t.Object({
	...summary.properties,
	items: t.Array(item),
	discount: moneyField,
	surcharge: moneyField,
	costs: t.Array(cost),
	/** In cents: what left the stock with the products. */
	productsCost: nonNegativeMoneyTotalField,
	/** In cents: the sum of the costs. */
	saleCosts: nonNegativeMoneyTotalField,
	/** Profit ÷ revenue; `null` when the revenue is zero. */
	margin: t.Union([t.Null(), t.Number()]),
	paymentCondition,
	paymentMethod,
	customerId: t.Union([t.Null(), t.String()]),
	resellerId: t.Union([t.Null(), t.String()]),
	/** Who entered it. */
	author: t.String(),
	canceledAt: t.Union([t.Null(), t.String()]),
	cancelReason: t.Union([t.Null(), t.String()]),
});

/**
 * A sale as the user enters it (vendas.md). Revenue, costs and profit are never sent: the server computes them. There's
 * no edit: a wrong one is canceled and entered again.
 */
const body = t.Object({
	/** The day it happened, "YYYY-MM-DD"; not after today. */
	date: dayField,
	channel,
	/** Required on the reseller channel, refused on the others. */
	resellerId: t.Union([t.Null(), idField]),
	customerId: t.Union([t.Null(), idField]),
	items: t.Array(
		t.Object({
			productId: idField,
			quantity: unitsField,
			/** In cents; zero is a gift that goes with the sale. */
			unitPrice: moneyField,
		}),
		{ minItems: 1, maxItems: MAX_SALE_ITEMS },
	),
	/** On the whole sale, in cents. */
	discount: moneyField,
	surcharge: moneyField,
	costs: t.Array(costOf({ label: optionalText(60) }), {
		maxItems: MAX_SALE_COSTS,
	}),
	paymentCondition,
	paymentMethod,
});

/** The periods the lists filter by (vendas.md), on the day the user gave each sale. */
const SALE_PERIODS = ["today", "7d", "month", "all"] as const;

export type SalePeriod = (typeof SALE_PERIODS)[number];

/** Today, the last 7 days (today included), this month, or every sale; on the day the user gave each sale. */
export const salePeriodField = t.UnionEnum(SALE_PERIODS);

const listQuery = t.Object({
	/** Left out, every sale. */
	period: t.Optional(salePeriodField),
	/** Any of these; none means every channel. */
	channels: t.Optional(t.Array(channel, { maxItems: CHANNELS.length })),
	/** Only sales with a profit (above zero), or only those with a loss. */
	result: t.Optional(t.UnionEnum(["profit", "loss"])),
	/** The sales of one customer, or of one reseller. */
	customerId: t.Optional(t.String({ format: "uuid" })),
	resellerId: t.Optional(t.String({ format: "uuid" })),
	cursor: cursorQuery,
});

/**
 * Of the active sales that match: canceled ones never count (vendas.md). `count` is how many sales that is; the page's
 * `total` also counts the canceled ones, which the list shows.
 */
const totals = t.Object({
	revenue: nonNegativeMoneyTotalField,
	profit: signedMoneyTotalField,
	count: t.Integer(),
});

const page = t.Object({ ...pageOf(summary).properties, totals });

export const SalesModel = {
	page,
	listQuery,
	detail,
	body,
	params: t.Object({ id: t.String({ format: "uuid" }) }),
};

export type SalesModel = {
	summary: UnwrapSchema<typeof summary>;
	listQuery: UnwrapSchema<typeof listQuery>;
	page: UnwrapSchema<typeof page>;
	item: UnwrapSchema<typeof item>;
	cost: UnwrapSchema<typeof cost>;
	detail: UnwrapSchema<typeof SalesModel.detail>;
	body: UnwrapSchema<typeof SalesModel.body>;
};
