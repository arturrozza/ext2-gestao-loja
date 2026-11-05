/** FAKE BACKEND (MUN-21): the one-line description of a purchase or sale. */
import type { ItemPreview } from "@/queries/products/products.types";
import { db } from "./fake-db";

/** The first three distinct products, for the thumbs of a row, and how many distinct products there are. */
export function previewItems(productIds: string[]): {
	preview: ItemPreview[];
	productCount: number;
} {
	const ids = [...new Set(productIds)];
	const preview = ids.slice(0, 3).map((id) => {
		const product = db.current.products.find((p) => p.id === id);
		return {
			productId: id,
			name: product?.name ?? "Produto",
			photoUri: product?.photoUri ?? null,
		};
	});
	return { preview, productCount: ids.length };
}

/** "Perfume Floral, Hidratante e mais 2". */
export function describeItems(productIds: string[]): string {
	const names = [...new Set(productIds)].map(
		(id) => db.current.products.find((p) => p.id === id)?.name ?? "Produto",
	);
	if (names.length <= 2) return names.join(" e ");
	return `${names.slice(0, 2).join(", ")} e mais ${names.length - 2}`;
}
