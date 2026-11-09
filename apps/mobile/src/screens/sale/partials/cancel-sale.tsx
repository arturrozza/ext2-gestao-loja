import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { UnderConstructionTag } from "@/components/under-construction";
import type { SaleDetail } from "@/queries/sales/sales.types";

/**
 * Cancel a sale (vendas.md): units go back to the same expiries, the average cost doesn't change, and the sale stays
 * visible, marked, out of sales, profit and commissions. Under construction until MUN-17 (the API has no cancellation
 * yet): the action shows, disabled and tagged. MUN-17 brings the confirmation with the reason.
 */
export function CancelSale({ sale }: { sale: SaleDetail }) {
	if (sale.status === "canceled") return null;
	return (
		<Button variant="ghost" disabled>
			<Text className="text-destructive">Cancelar venda</Text>
			<UnderConstructionTag />
		</Button>
	);
}
