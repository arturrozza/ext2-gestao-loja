import { t, type UnwrapSchema } from "elysia";
import {
	dayField,
	expiryMonthField,
	idField,
	moneyField,
	nonNegativeMoneyTotalField,
	optionalText,
	unitsField,
} from "../../lib/fields";
import { cursorQuery, pageOf } from "../../lib/pagination";
import { previewField } from "../../lib/preview";

/** Most lines one purchase takes. */
export const MAX_PURCHASE_ITEMS = 100;

const status = t.Union([t.Literal("active"), t.Literal("canceled")]);

/** A purchase in the history. */
const summary = t.Object({
	id: t.String(),
	/** "Compra #12". */
	number: t.Integer(),
	/** "2026-11-09". */
	date: t.String(),
	status,
	/** Lines in it. */
	itemCount: t.Integer(),
	/** Units over every line. */
	unitCount: t.Integer(),
	/** In cents: the sum of quantity × unit cost. */
	total: nonNegativeMoneyTotalField,
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
	unitCost: moneyField,
	/** In cents: quantity × unit cost. */
	total: nonNegativeMoneyTotalField,
	expiry: t.Union([t.Null(), expiryMonthField]),
});

const detail = t.Object({
	...summary.properties,
	note: t.Union([t.Null(), t.String()]),
	/** Who entered it. */
	author: t.String(),
	/** When it was entered (ISO). */
	createdAt: t.String(),
	canceledAt: t.Union([t.Null(), t.String()]),
	items: t.Array(item),
});

/** A purchase as the user enters it (compras.md). There's no edit: a wrong one is canceled and entered again. */
const body = t.Object({
	/** The day it happened, "YYYY-MM-DD"; not after today. */
	date: dayField,
	note: optionalText(500),
	items: t.Array(
		t.Object({
			productId: idField,
			quantity: unitsField,
			/** In cents; zero is allowed. */
			unitCost: moneyField,
			/** Required when the product has expiry, refused when it hasn't; never a month already gone. */
			expiry: t.Union([t.Null(), expiryMonthField]),
		}),
		{ minItems: 1, maxItems: MAX_PURCHASE_ITEMS },
	),
});

const listQuery = t.Object({
	/** Only active or only canceled; left out, both. */
	status: t.Optional(status),
	cursor: cursorQuery,
});

export const PurchasesModel = {
	page: pageOf(summary),
	listQuery,
	detail,
	body,
	params: t.Object({ id: t.String({ format: "uuid" }) }),
};

export type PurchasesModel = {
	summary: UnwrapSchema<typeof summary>;
	item: UnwrapSchema<typeof item>;
	page: UnwrapSchema<typeof PurchasesModel.page>;
	listQuery: UnwrapSchema<typeof PurchasesModel.listQuery>;
	detail: UnwrapSchema<typeof PurchasesModel.detail>;
	body: UnwrapSchema<typeof PurchasesModel.body>;
};
