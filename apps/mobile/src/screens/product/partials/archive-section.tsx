import { ArchiveControl } from "@/components/archive-control";
import { units } from "@/lib/labels";
import type { ProductDetail } from "@/queries/products/products.types";
import { useSetProductArchived } from "@/queries/products/use-products";

/** Archived products stay in the history and reports but don't enter new purchases or sales (produtos.md). */
export function ArchiveSection({ product }: { product: ProductDetail }) {
	const mutation = useSetProductArchived(product.id);
	const remaining =
		product.stock > 0 ? ` Ainda há ${units(product.stock)} no estoque.` : "";

	return (
		<ArchiveControl
			noun="produto"
			archived={product.archived}
			archivedText="Produto arquivado: não entra em novas compras nem vendas, mas continua no histórico e nos relatórios."
			confirmText={`${product.name} sai das novas compras e vendas e do valor em estoque.${remaining} O histórico e os relatórios continuam com ele, e dá para reativar depois.`}
			mutation={mutation}
		/>
	);
}
