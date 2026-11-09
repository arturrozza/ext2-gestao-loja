import { t, type UnwrapSchema } from "elysia";
import {
	nonNegativeMoneyTotalField,
	optionalText,
	percentField,
} from "../../lib/fields";
import { salePeriodField } from "../sales/sales.model";

const reseller = t.Object({
	id: t.String(),
	name: t.String(),
	/** Digits only ("11999998888"). */
	phone: t.Union([t.Null(), t.String()]),
	/** In basis points (7,5% = 750). */
	defaultCommission: percentField,
	note: t.Union([t.Null(), t.String()]),
	archived: t.Boolean(),
	/** Active (not canceled) sales on the reseller channel, of all time; `GET /resellers/:id` takes a `period`. */
	salesCount: t.Integer(),
	/** In cents: their revenue. */
	salesTotal: nonNegativeMoneyTotalField,
	/** In cents: the commission costs of those sales. */
	commissionTotal: nonNegativeMoneyTotalField,
});

/** What the reseller form edits (revendedoras.md). */
const body = t.Object({
	name: t.String({ minLength: 1, maxLength: 120, pattern: "\\S" }),
	/** With the area code, masked or not. */
	phone: optionalText(30),
	defaultCommission: percentField,
	note: optionalText(500),
});

const listQuery = t.Object({
	/** Name or phone; every word has to match. */
	search: t.Optional(t.String({ maxLength: 100 })),
	/** `true` lists only archived resellers; otherwise only active ones. */
	archived: t.Optional(t.Boolean()),
});

/** The period of her numbers (revendedoras.md): the same ones the sales list has. Left out, every sale. */
const getQuery = t.Object({ period: t.Optional(salePeriodField) });

export const ResellersModel = {
	getQuery,
	reseller,
	list: t.Array(reseller),
	body,
	listQuery,
	params: t.Object({ id: t.String({ format: "uuid" }) }),
};

export type ResellersModel = {
	reseller: UnwrapSchema<typeof ResellersModel.reseller>;
	body: UnwrapSchema<typeof ResellersModel.body>;
	listQuery: UnwrapSchema<typeof ResellersModel.listQuery>;
	getQuery: UnwrapSchema<typeof ResellersModel.getQuery>;
};
