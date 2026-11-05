import { ItemRow } from "@/components/item-row";
import { ProductThumb } from "@/components/product-thumb";
import { formatMoney } from "@/lib/money";
import type { Product } from "@/queries/products/products.types";

/** Price and where it is. Cost and stock value are on the product screen (docs/product/estoque.md, "Na lista"). */
function detailLine(product: Product) {
	return [formatMoney(product.basePrice), product.location]
		.filter(Boolean)
		.join(" · ");
}

/**
 * A product of the list. The quantity is "—" until purchases exist (MUN-12); then it comes back with the most urgent
 * stock state under it (docs/product/alertas.md).
 */
export function ProductRow({ product }: { product: Product }) {
	return (
		<ItemRow
			href={`/products/${product.id}`}
			label={product.archived ? `${product.name}, arquivado` : product.name}
			leading={<ProductThumb name={product.name} />}
			title={product.name}
			subtitle={detailLine(product)}
			value="—"
			note={product.archived ? "arquivado" : undefined}
			noteTone="muted"
		/>
	);
}
