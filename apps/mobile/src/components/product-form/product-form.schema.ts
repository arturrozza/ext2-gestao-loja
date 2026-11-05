import { z } from "zod";
import { optionalText } from "@/lib/form-fields";
import { fromCents, moneyToInput, parseMoneyInput } from "@/lib/money";
import type { Product } from "@/queries/products/products.types";

/** Product form (produtos.md): name and base price required; stock and cost never typed here. */
export const productFormSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Informe o nome.")
		.max(120, "Use até 120 caracteres."),
	basePrice: z.string().transform((text, ctx) => {
		const cents = parseMoneyInput(text);
		if (cents === null || cents === 0) {
			ctx.addIssue({ code: "custom", message: "Informe o preço de venda." });
			return z.NEVER;
		}
		return fromCents(cents);
	}),
	categoryId: z.string().nullable(),
	barcode: optionalText.refine(
		(value) => value === null || value.length <= 64,
		"Use até 64 caracteres.",
	),
	internalCode: optionalText.refine(
		(value) => value === null || value.length <= 64,
		"Use até 64 caracteres.",
	),
	minStock: z.string().transform((text, ctx) => {
		const clean = text.trim();
		if (!clean) return null;
		if (!/^\d+$/.test(clean) || Number(clean) > 1_000_000) {
			ctx.addIssue({
				code: "custom",
				message: "Use um número inteiro até 1.000.000.",
			});
			return z.NEVER;
		}
		return Number(clean);
	}),
	location: optionalText.refine(
		(value) => value === null || value.length <= 120,
		"Use até 120 caracteres.",
	),
	hasExpiry: z.boolean(),
});

export type ProductFormValues = z.input<typeof productFormSchema>;

export const EMPTY_PRODUCT: ProductFormValues = {
	name: "",
	basePrice: "",
	categoryId: null,
	barcode: "",
	internalCode: "",
	minStock: "",
	location: "",
	hasExpiry: false,
};

export function productToForm(product: Product): ProductFormValues {
	return {
		name: product.name,
		basePrice: moneyToInput(product.basePrice),
		categoryId: product.categoryId,
		barcode: product.barcode ?? "",
		internalCode: product.internalCode ?? "",
		minStock: product.minStock === null ? "" : String(product.minStock),
		location: product.location ?? "",
		hasExpiry: product.hasExpiry,
	};
}
