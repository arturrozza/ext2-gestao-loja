import { z } from "zod";
import { optionalText } from "@/lib/form-fields";
import { moneyToInput, parseMoneyInput } from "@/lib/money";
import type { PhotoChange, Product } from "@/queries/products/products.types";

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
		return cents;
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
	/**
	 * The photo shown: the saved one's address, a new local photo (`file://`), or none. Not named `photo`/`photoKey`:
	 * the API's photo errors carry those fields, and only names that aren't form fields reach the footer.
	 */
	photoUri: z.string().nullable(),
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
	photoUri: null,
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
		photoUri: product.photoUrl,
	};
}

/**
 * What changed in the photo since the form opened (`saved`): nothing (keep), removed, or a new photo to send (a picked
 * photo is always a new local file, never the saved address).
 */
export function photoChange(
	saved: string | null,
	current: string | null,
): PhotoChange {
	if (current === saved) return undefined;
	return current === null ? null : { uri: current };
}
