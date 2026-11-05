import { ArchiveControl } from "@/components/archive-control";
import type { Product } from "@/queries/products/products.types";
import { useSetProductArchived } from "@/queries/products/use-products";

/**
 * Archived products stay in the history and reports but don't enter new purchases or sales, and aren't edited until
 * reactivated (produtos.md).
 */
export function ArchiveSection({ product }: { product: Product }) {
	const mutation = useSetProductArchived(product.id);

	return (
		<ArchiveControl
			noun="produto"
			archived={product.archived}
			archivedText="Produto arquivado: não entra em novas compras nem vendas e não pode ser editado, mas continua no histórico e nos relatórios."
			confirmText={`${product.name} sai das novas compras e vendas. O histórico e os relatórios continuam com ele, e dá para reativar depois.`}
			mutation={mutation}
		/>
	);
}
