import { z } from "zod";
import { parseDateInput, parseExpiryInput, todayISODate } from "@/lib/dates";
import { parseMoneyInput } from "@/lib/money";

/** One line being typed: the product, how many, unit cost, expiry, lot number and manufacture month (compras.md). */
export type PurchaseItemDraft = {
	key: string;
	product: {
		id: string;
		name: string;
		hasExpiry: boolean;
		photoUrl: string | null;
	};
	quantity: number;
	unitCost: string;
	expiry: string;
	/** Only for a product with expiry; blank is none. */
	lotCode: string;
	/** "mm/aaaa"; blank is none. */
	manufacturedOn: string;
};

export type NewPurchaseValues = {
	date: string;
	note: string;
	items: PurchaseItemDraft[];
};

/** The API's limits (`MAX_LINE_UNITS`, `MAX_PURCHASE_ITEMS` in the server): checked here to say it on the line. */
const MAX_LINE_UNITS = 100_000;
const MAX_PURCHASE_ITEMS = 100;
const MAX_LOT_CODE = 40;

type Ctx = z.RefinementCtx;

function fail(ctx: Ctx, path: (string | number)[], message: string) {
	ctx.addIssue({ code: "custom", path, message });
}

/** The manufacture month: optional, never in the future (compras.md, RN-COM-16). */
function parseManufacture(
	item: PurchaseItemDraft,
	path: (string | number)[],
	ctx: Ctx,
) {
	const made = parseExpiryInput(item.manufacturedOn);
	if (made && made > todayISODate().slice(0, 7))
		fail(
			ctx,
			[...path, "manufacturedOn"],
			"A fabricação não pode ser de um mês futuro.",
		);
	return made;
}

/** The lot number (only with expiry on the product) and the manufacture month of a line. */
function parseLot(
	item: PurchaseItemDraft,
	path: (string | number)[],
	ctx: Ctx,
) {
	const lotCode = item.lotCode.trim();
	if (lotCode.length > MAX_LOT_CODE)
		fail(ctx, [...path, "lotCode"], "No máximo 40 caracteres.");
	return {
		lotCode: item.product.hasExpiry && lotCode ? lotCode : null,
		manufacturedOn: parseManufacture(item, path, ctx),
	};
}

/** Item in the shape the API takes. Reports every problem of the line at once. */
function parseItem(item: PurchaseItemDraft, index: number, ctx: Ctx) {
	const path = ["items", index];
	const cents = parseMoneyInput(item.unitCost);
	const expiry = parseExpiryInput(item.expiry);
	if (item.quantity < 1)
		fail(ctx, [...path, "quantity"], "Quantidade maior que zero.");
	if (item.quantity > MAX_LINE_UNITS)
		fail(ctx, [...path, "quantity"], "No máximo 100.000 unidades por item.");
	if (cents === null) fail(ctx, [...path, "unitCost"], "Informe o custo.");
	if (item.product.hasExpiry && !expiry)
		fail(ctx, [...path, "expiry"], "Informe a validade (mês/ano).");
	return {
		productId: item.product.id,
		quantity: item.quantity,
		unitCost: cents ?? 0,
		expiry: item.product.hasExpiry ? expiry : null,
		...parseLot(item, path, ctx),
	};
}

/** New purchase form → API input. All the errors show up together on the first submit attempt. */
export const newPurchaseSchema = z
	.custom<NewPurchaseValues>()
	.transform((values, ctx) => {
		const date = parseDateInput(values.date);
		if (!date) fail(ctx, ["date"], "Data inválida (dd/mm/aaaa).");
		if (values.items.length === 0)
			fail(ctx, ["items"], "Adicione pelo menos um produto.");
		if (values.items.length > MAX_PURCHASE_ITEMS)
			fail(ctx, ["items"], "No máximo 100 itens por compra.");
		const items = values.items.map((item, index) =>
			parseItem(item, index, ctx),
		);
		if (ctx.issues.length > 0 || !date) return z.NEVER;
		return { date, note: values.note.trim() || null, items };
	});
