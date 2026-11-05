import { ItemRow } from "@/components/item-row";
import { ProductThumb } from "@/components/product-thumb";
import { times } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import type { ProductListItem } from "@/queries/products/products.types";

/** Price and where it is. Cost and stock value are on the product screen (docs/product/estoque.md, "Na lista"). */
function detailLine(product: ProductListItem) {
	return [formatMoney(product.basePrice), product.location]
		.filter(Boolean)
		.join(" · ");
}

type StockNote = { text: string; tone: "muted" | "danger" | "highlight" };

/**
 * The most urgent stock state, said under the quantity instead of a pill (pills made the row taller). Order follows
 * docs/product/alertas.md: no stock, expired, low, about to expire.
 */
function stockNote(product: ProductListItem): StockNote {
	const { flags } = product;
	if (product.archived) return { text: "arquivado", tone: "muted" };
	if (flags.outOfStock) return { text: "sem estoque", tone: "danger" };
	if (flags.expired) return { text: "tem vencido", tone: "danger" };
	if (flags.lowStock) return { text: "estoque baixo", tone: "highlight" };
	if (flags.nearExpiry) return { text: "perto de vencer", tone: "highlight" };
	return { text: "em estoque", tone: "muted" };
}

export function ProductRow({ product }: { product: ProductListItem }) {
	const note = stockNote(product);
	return (
		<ItemRow
			href={`/products/${product.id}`}
			label={`${product.name}, ${product.stock} em estoque, ${note.text}`}
			leading={<ProductThumb uri={product.photoUri} name={product.name} />}
			title={product.name}
			subtitle={detailLine(product)}
			value={times(product.stock)}
			valueTone={product.stock === 0 ? "danger" : undefined}
			note={note.text}
			noteTone={note.tone}
		/>
	);
}
