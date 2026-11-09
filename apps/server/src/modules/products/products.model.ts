import { t, type UnwrapSchema } from "elysia";
import { moneyField, optionalText } from "../../lib/fields";
import { cursorQuery, pageOf } from "../../lib/pagination";
import { STOCK_STATES } from "../stock/stock.rules";

const product = t.Object({
	id: t.String(),
	name: t.String(),
	/** In cents (R$ 92,50 = 9250). */
	basePrice: moneyField,
	categoryId: t.Union([t.Null(), t.String()]),
	categoryName: t.Union([t.Null(), t.String()]),
	barcode: t.Union([t.Null(), t.String()]),
	internalCode: t.Union([t.Null(), t.String()]),
	minStock: t.Union([t.Null(), t.Integer()]),
	location: t.Union([t.Null(), t.String()]),
	hasExpiry: t.Boolean(),
	/** Public address of the photo; null without one (the app shows its initials). */
	photoUrl: t.Union([t.Null(), t.String()]),
	archived: t.Boolean(),
	/** Units in stock, expired ones included until discarded. Stock and cost only come from the ledger (estoque.md). */
	stock: t.Integer(),
	/** Units that can be sold (not expired). */
	sellableStock: t.Integer(),
	/** In cents: stock value ÷ units, rounded to the cent; zero without stock. */
	averageCost: moneyField,
	/** In cents. */
	stockValue: moneyField,
	flags: t.Object({ lowStock: t.Boolean(), outOfStock: t.Boolean() }),
});

/** What the product form edits (produtos.md): stock and cost never, they come from purchases. */
const body = t.Object({
	name: t.String({ minLength: 1, maxLength: 120, pattern: "\\S" }),
	/** In cents, above zero (the rules give the message). */
	basePrice: moneyField,
	categoryId: t.Union([t.Null(), t.String({ format: "uuid" })]),
	barcode: optionalText(64),
	internalCode: optionalText(64),
	minStock: t.Union([t.Null(), t.Integer({ minimum: 0, maximum: 1_000_000 })]),
	location: optionalText(120),
	hasExpiry: t.Boolean(),
	/**
	 * The `key` `POST /products/photos` gave back for the photo; `null` removes the photo. Left out, the product keeps
	 * the photo it has (none on create).
	 */
	// Real keys are under 100 characters and their shape is checked by the service; this only keeps junk out.
	photoKey: t.Optional(t.Union([t.Null(), t.String({ maxLength: 200 })])),
});

/**
 * One photo, as multipart: a JPEG the app already shrank. Its size and format are checked by its bytes in the service
 * (`assertJpeg`, with its own messages); the server's body limit already caps what is read (`src/index.ts`).
 */
const photoUpload = t.Object({
	photo: t.File(),
});

/** Where the photo was stored: what the product form saves as `photoKey`. */
const uploadedPhoto = t.Object({ key: t.String() });

const listQuery = t.Object({
	/** Name, internal code or barcode; every word has to match. */
	search: t.Optional(t.String({ maxLength: 100 })),
	/** Any of these; none means every category. */
	categoryIds: t.Optional(
		t.Array(t.String({ format: "uuid" }), { maxItems: 100 }),
	),
	/** `true` lists only archived products; otherwise only active ones. */
	archived: t.Optional(t.Boolean()),
	/** Any of these states; none means every product. */
	stock: t.Optional(
		t.Array(t.UnionEnum(STOCK_STATES), { maxItems: STOCK_STATES.length }),
	),
	cursor: cursorQuery,
});

export const ProductsModel = {
	product,
	page: pageOf(product),
	body,
	photoUpload,
	uploadedPhoto,
	listQuery,
	params: t.Object({ id: t.String({ format: "uuid" }) }),
};

export type ProductsModel = {
	product: UnwrapSchema<typeof ProductsModel.product>;
	page: UnwrapSchema<typeof ProductsModel.page>;
	body: UnwrapSchema<typeof ProductsModel.body>;
	uploadedPhoto: UnwrapSchema<typeof ProductsModel.uploadedPhoto>;
	listQuery: UnwrapSchema<typeof ProductsModel.listQuery>;
};
