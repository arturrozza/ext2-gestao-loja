import { z } from "zod";
import { parseDateInput, parseExpiryInput } from "@/lib/dates";
import { fromCents, parseMoneyInput } from "@/lib/money";

/** One line being typed: the product, how many, unit cost and expiry (compras.md). */
export type PurchaseItemDraft = {
	key: string;
	product: {
		id: string;
		name: string;
		hasExpiry: boolean;
		photoUri: string | null;
	};
	quantity: number;
	unitCost: string;
	expiry: string;
};

export type NewPurchaseValues = {
	date: string;
	note: string;
	items: PurchaseItemDraft[];
};

type Ctx = z.RefinementCtx;

function fail(ctx: Ctx, path: (string | number)[], message: string) {
	ctx.addIssue({ code: "custom", path, message });
}

/** Item in the shape the API takes. Reports every problem of the line at once. */
function parseItem(item: PurchaseItemDraft, index: number, ctx: Ctx) {
	const path = ["items", index];
	const cents = parseMoneyInput(item.unitCost);
	const expiry = parseExpiryInput(item.expiry);
	if (item.quantity < 1)
		fail(ctx, [...path, "quantity"], "Quantidade maior que zero.");
	if (cents === null) fail(ctx, [...path, "unitCost"], "Informe o custo.");
	if (item.product.hasExpiry && !expiry)
		fail(ctx, [...path, "expiry"], "Informe a validade (mês/ano).");
	return {
		productId: item.product.id,
		quantity: item.quantity,
		unitCost: fromCents(cents ?? 0),
		expiry: item.product.hasExpiry ? expiry : null,
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
		const items = values.items.map((item, index) =>
			parseItem(item, index, ctx),
		);
		if (ctx.issues.length > 0 || !date) return z.NEVER;
		return { date, note: values.note.trim() || null, items };
	});
