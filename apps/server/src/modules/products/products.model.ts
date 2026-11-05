import { t, type UnwrapSchema } from "elysia";
import { optionalText } from "../../lib/fields";
import { cursorQuery, pageOf } from "../../lib/pagination";

/** Money as a decimal string with up to two places ("92.5"), like the app's `Money`; never a float. */
const money = t.String({ pattern: "^\\d{1,10}(\\.\\d{1,2})?$" });

const product = t.Object({
	id: t.String(),
	name: t.String(),
	/** Two places ("92.50"). */
	basePrice: t.String(),
	categoryId: t.Union([t.Null(), t.String()]),
	categoryName: t.Union([t.Null(), t.String()]),
	barcode: t.Union([t.Null(), t.String()]),
	internalCode: t.Union([t.Null(), t.String()]),
	minStock: t.Union([t.Null(), t.Integer()]),
	location: t.Union([t.Null(), t.String()]),
	hasExpiry: t.Boolean(),
	archived: t.Boolean(),
});

/** What the product form edits (produtos.md): stock and cost never, they come from purchases. */
const body = t.Object({
	name: t.String({ minLength: 1, maxLength: 120, pattern: "\\S" }),
	basePrice: money,
	categoryId: t.Union([t.Null(), t.String({ format: "uuid" })]),
	barcode: optionalText(64),
	internalCode: optionalText(64),
	minStock: t.Union([t.Null(), t.Integer({ minimum: 0, maximum: 1_000_000 })]),
	location: optionalText(120),
	hasExpiry: t.Boolean(),
});

const listQuery = t.Object({
	/** Name, internal code or barcode; every word has to match. */
	search: t.Optional(t.String({ maxLength: 100 })),
	/** Any of these; none means every category. */
	categoryIds: t.Optional(
		t.Array(t.String({ format: "uuid" }), { maxItems: 100 }),
	),
	/** `true` lists only archived products; otherwise only active ones. */
	archived: t.Optional(t.Boolean()),
	cursor: cursorQuery,
});

export const ProductsModel = {
	product,
	page: pageOf(product),
	body,
	listQuery,
	params: t.Object({ id: t.String({ format: "uuid" }) }),
};

export type ProductsModel = {
	product: UnwrapSchema<typeof ProductsModel.product>;
	page: UnwrapSchema<typeof ProductsModel.page>;
	body: UnwrapSchema<typeof ProductsModel.body>;
	listQuery: UnwrapSchema<typeof ProductsModel.listQuery>;
};
