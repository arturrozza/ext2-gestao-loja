import { ItemRow } from "@/components/item-row";
import { ProductThumb } from "@/components/product-thumb";
import { times, units } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { stockStatus } from "@/lib/stock-status";
import type { Product } from "@/queries/products/products.types";

/** Price and where it is. Cost and stock value are on the product screen (docs/product/estoque.md, "Na lista"). */
function detailLine(product: Product) {
	return [formatMoney(product.basePrice), product.location]
		.filter(Boolean)
		.join(" · ");
}

/** A product of the list: its quantity, with its most urgent stock state (or "arquivado") under it. */
export function ProductRow({ product }: { product: Product }) {
	const status = stockStatus(product.flags);
	const note = product.archived ? "arquivado" : status?.label.toLowerCase();
	return (
		<ItemRow
			href={`/products/${product.id}`}
			label={[
				product.name,
				product.stock > 0 ? units(product.stock) : null,
				note,
			]
				.filter(Boolean)
				.join(", ")}
			leading={<ProductThumb uri={product.photoUrl} name={product.name} />}
			title={product.name}
			subtitle={detailLine(product)}
			value={times(product.stock)}
			note={note}
			noteTone={product.archived ? "muted" : status?.tone}
		/>
	);
}
