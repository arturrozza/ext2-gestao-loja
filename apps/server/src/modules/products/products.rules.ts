import { httpError } from "../../lib/http-error";
import { normalizeSearch } from "../../lib/search";
import { blankToNull } from "../../lib/text";
import type { ProductsModel } from "./products.model";

/**
 * A product as it's saved: trimmed, blanks as null, base price above zero (produtos.md), and the text the search
 * matches (name and codes).
 */
export function normalizeProduct(input: ProductsModel["body"]) {
	if (input.basePrice <= 0) {
		throw httpError(422, {
			code: "validation",
			message: "O preço precisa ser maior que zero.",
			field: "basePrice",
		});
	}
	const values = {
		name: input.name.trim(),
		basePrice: input.basePrice,
		categoryId: input.categoryId,
		barcode: blankToNull(input.barcode),
		internalCode: blankToNull(input.internalCode),
		minStock: input.minStock,
		location: blankToNull(input.location),
		hasExpiry: input.hasExpiry,
	};
	const searchText = normalizeSearch(
		[values.name, values.internalCode, values.barcode].join(" "),
	);
	return { ...values, searchText };
}

export type ProductValues = ReturnType<typeof normalizeProduct>;
