import { audited } from "../../../src/db/audit";
import { insertedRow } from "../../../src/db/rows";
import { categories, products } from "../../../src/db/schema";
import { normalizeSearch } from "../../../src/lib/search";
import type { ProductsModel } from "../../../src/modules/products/products.model";
import { normalizeProduct } from "../../../src/modules/products/products.rules";

let sequence = 0;

type CategoryOverrides = { name?: string; archived?: boolean };

export async function createCategory(
	storeId: string,
	overrides: CategoryOverrides = {},
) {
	sequence += 1;
	const name = overrides.name ?? `Categoria ${sequence}`;
	const category = insertedRow(
		await audited("system", (tx) =>
			tx
				.insert(categories)
				.values({
					storeId,
					name,
					normalizedName: normalizeSearch(name),
					archivedAt: overrides.archived ? new Date() : null,
				})
				.returning(),
		),
	);
	return category;
}

/** A valid product form body; override any field. */
export function productBody(
	overrides: Partial<ProductsModel["body"]> = {},
): ProductsModel["body"] {
	sequence += 1;
	return {
		name: `Produto ${sequence}`,
		basePrice: "10.00",
		categoryId: null,
		barcode: null,
		internalCode: null,
		minStock: null,
		location: null,
		hasExpiry: false,
		...overrides,
	};
}

export async function createProduct(
	storeId: string,
	overrides: Partial<ProductsModel["body"]> & { archived?: boolean } = {},
) {
	const { archived, ...body } = overrides;
	const product = insertedRow(
		await audited("system", (tx) =>
			tx
				.insert(products)
				.values({
					storeId,
					...normalizeProduct(productBody(body)),
					archivedAt: archived ? new Date() : null,
				})
				.returning(),
		),
	);
	return product;
}
