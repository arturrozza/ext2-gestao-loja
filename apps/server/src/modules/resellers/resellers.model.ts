import { t, type UnwrapSchema } from "elysia";
import { optionalText, percentField } from "../../lib/fields";

const reseller = t.Object({
	id: t.String(),
	name: t.String(),
	/** Digits only ("11999998888"). */
	phone: t.Union([t.Null(), t.String()]),
	/** Decimal string without trailing zeros ("10", "7.5"). */
	defaultCommission: t.String(),
	note: t.Union([t.Null(), t.String()]),
	archived: t.Boolean(),
	/** Active (not canceled) sales on the reseller channel. */
	salesCount: t.Integer(),
	/** Two places ("200.00"). */
	salesTotal: t.String(),
	commissionTotal: t.String(),
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

export const ResellersModel = {
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
};
