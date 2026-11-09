import { Type } from "@sinclair/typebox";
import { t, type UnwrapSchema } from "elysia";
import { stockAdjustmentReason, stockMovementType } from "../../db/schema";
import {
	expiryMonthField,
	moneyField,
	nonNegativeMoneyTotalField,
	optionalText,
} from "../../lib/fields";
import { cursorQuery, pageOf } from "../../lib/pagination";
import { MAX_STOCK_UNITS, STOCK_STATES } from "../stock/stock.rules";

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
	flags: t.Object({
		lowStock: t.Boolean(),
		outOfStock: t.Boolean(),
		/** Has units that expire within the store's warning days. */
		nearExpiry: t.Boolean(),
		/** Has units past their expiry, still counted until discarded. */
		expired: t.Boolean(),
	}),
});

/** Units with the same expiry ("YYYY-MM", `null`: none). Lots stay hidden from the user (estoque.md). */
const expiryBalance = t.Object({
	expiry: t.Union([t.Null(), t.String()]),
	quantity: t.Integer(),
	expired: t.Boolean(),
	nearExpiry: t.Boolean(),
});

/** One product on its own screen: with its units by expiry, soonest first. */
const productDetail = t.Object({
	...product.properties,
	expiries: t.Array(expiryBalance),
});

/** One entry of the stock ledger (estoque.md): never changes once written. */
const movement = t.Object({
	id: t.String(),
	type: t.UnionEnum(stockMovementType.enumValues),
	/** Signed change in units (0 for a cost correction). */
	quantity: t.Integer(),
	/** In cents: the cost of an entry, the average cost taken by an exit, the corrected cost. */
	unitCost: moneyField,
	averageCostAfter: moneyField,
	stockAfter: t.Integer(),
	/** Why, on an adjustment. */
	reason: t.Union([t.Null(), t.UnionEnum(stockAdjustmentReason.enumValues)]),
	note: t.Union([t.Null(), t.String()]),
	/** The purchase or sale it came from, to open from the history. */
	origin: t.Union([
		t.Null(),
		t.Object({
			kind: t.Union([t.Literal("purchase"), t.Literal("sale")]),
			id: t.String(),
			number: t.Integer(),
		}),
	]),
	createdAt: t.String(),
	/** Name of who did it. */
	author: t.String(),
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

/** Stock adjustment (estoque.md, "Ajuste"): the right quantity and why. The rules check what goes with what. */
const adjustmentBody = t.Object({
	newQuantity: Type.Integer({ minimum: 0, maximum: MAX_STOCK_UNITS }),
	reason: t.UnionEnum(stockAdjustmentReason.enumValues),
	/** Required for "other". */
	note: optionalText(500),
	/** Going down with more than one expiry: where the units left from (`null`: those without expiry). */
	fromExpiry: t.Optional(t.Union([t.Null(), expiryMonthField])),
	/** Going up on a product with expiry: the expiry of the new units. */
	expiry: t.Optional(t.Union([t.Null(), expiryMonthField])),
});

/** Cost correction (estoque.md, "Corrigir custo"): the right average cost, in cents, and why. */
const costCorrectionBody = t.Object({
	newCost: moneyField,
	note: t.String({ minLength: 1, maxLength: 500, pattern: "\\S" }),
});

export const ProductsModel = {
	product,
	productDetail,
	page: pageOf(product),
	movement,
	movementsPage: pageOf(movement),
	adjustmentBody,
	costCorrectionBody,
	/** `cursor`: the `nextCursor` of the page before (a ledger `seq`); left out, the newest page. */
	movementsQuery: t.Object({
		cursor: t.Optional(
			t.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
		),
	}),
	/** In cents: all the store's stock (estoque.md, "valor total em estoque"). */
	stockValue: t.Object({ value: nonNegativeMoneyTotalField }),
	body,
	photoUpload,
	uploadedPhoto,
	listQuery,
	params: t.Object({ id: t.String({ format: "uuid" }) }),
};

export type ProductsModel = {
	product: UnwrapSchema<typeof ProductsModel.product>;
	productDetail: UnwrapSchema<typeof ProductsModel.productDetail>;
	page: UnwrapSchema<typeof ProductsModel.page>;
	movementsPage: UnwrapSchema<typeof ProductsModel.movementsPage>;
	stockValue: UnwrapSchema<typeof ProductsModel.stockValue>;
	adjustmentBody: UnwrapSchema<typeof ProductsModel.adjustmentBody>;
	costCorrectionBody: UnwrapSchema<typeof ProductsModel.costCorrectionBody>;
	body: UnwrapSchema<typeof ProductsModel.body>;
	uploadedPhoto: UnwrapSchema<typeof ProductsModel.uploadedPhoto>;
	listQuery: UnwrapSchema<typeof ProductsModel.listQuery>;
};
