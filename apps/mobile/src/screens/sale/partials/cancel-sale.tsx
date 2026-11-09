import { CancelControl } from "@/components/cancel-control";
import type { SaleDetail } from "@/queries/sales/sales.types";
import { useCancelSale } from "@/queries/sales/use-sales";

/**
 * Cancel a sale (vendas.md, "Cancelamento"), with its reason: the units go back to the same expiries, the average cost
 * doesn't change, and the sale stays visible, marked, out of sales, profit and commissions.
 */
export function CancelSale({ sale }: { sale: SaleDetail }) {
	return (
		<CancelControl
			canceled={sale.status === "canceled"}
			noun="venda"
			title={`Venda #${sale.number}`}
			description="As unidades voltam ao estoque nas mesmas validades e o custo médio não muda. A venda continua na lista, marcada, e deixa de contar nas vendas, no lucro e nas comissões."
			successMessage="Venda cancelada"
			reasonRequired
			placeholder="Ex.: lançada com o produto errado"
			mutation={useCancelSale(sale.id)}
		/>
	);
}
