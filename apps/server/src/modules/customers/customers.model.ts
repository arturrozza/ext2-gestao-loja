import { t, type UnwrapSchema } from "elysia";
import { nonNegativeMoneyTotalField, optionalText } from "../../lib/fields";
import { cursorQuery, pageOf } from "../../lib/pagination";

const customer = t.Object({
	id: t.String(),
	name: t.String(),
	/** Digits only ("11999998888"). */
	phone: t.Union([t.Null(), t.String()]),
	address: t.Union([t.Null(), t.String()]),
	note: t.Union([t.Null(), t.String()]),
	archived: t.Boolean(),
	/** Active (not canceled) sales with this customer. */
	purchasesCount: t.Integer(),
	totalSpent: nonNegativeMoneyTotalField,
	/** Day of the last active sale ("2026-11-08"), `null` before the first. */
	lastPurchaseAt: t.Union([t.Null(), t.String()]),
});

/** What the customer form edits (clientes.md). In a sale, only the name is filled. */
const body = t.Object({
	name: t.String({ minLength: 1, maxLength: 120, pattern: "\\S" }),
	/** With the area code, masked or not. */
	phone: optionalText(30),
	/**
	 * Free text. Optional in the contract so an app from before the field still saves: left out, an edit keeps the
	 * address the customer has.
	 */
	address: t.Optional(optionalText(300)),
	note: optionalText(500),
});

const listQuery = t.Object({
	/** Name or phone; every word has to match. */
	search: t.Optional(t.String({ maxLength: 100 })),
	/** `true` lists only archived customers; otherwise only active ones. */
	archived: t.Optional(t.Boolean()),
	cursor: cursorQuery,
});

export const CustomersModel = {
	customer,
	page: pageOf(customer),
	body,
	listQuery,
	params: t.Object({ id: t.String({ format: "uuid" }) }),
};

export type CustomersModel = {
	customer: UnwrapSchema<typeof CustomersModel.customer>;
	page: UnwrapSchema<typeof CustomersModel.page>;
	body: UnwrapSchema<typeof CustomersModel.body>;
	listQuery: UnwrapSchema<typeof CustomersModel.listQuery>;
};
