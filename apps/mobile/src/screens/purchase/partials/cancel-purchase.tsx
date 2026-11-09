import { CancelControl } from "@/components/cancel-control";
import type { PurchaseDetail } from "@/queries/purchases/purchases.types";
import { useCancelPurchase } from "@/queries/purchases/use-purchases";

/**
 * Cancel a purchase (compras.md, "Cancelamento"), with an optional reason: stock and average cost go back as if it
 * never existed, and it stays in the history, marked. With a unit already sold or adjusted the API refuses it, and
 * the sheet says why and how to correct it instead.
 */
export function CancelPurchase({ purchase }: { purchase: PurchaseDetail }) {
	return (
		<CancelControl
			canceled={purchase.status === "canceled"}
			noun="compra"
			title={`Compra #${purchase.number}`}
			description="O estoque e o custo médio voltam como se ela não tivesse existido. Ela continua no histórico, marcada como cancelada."
			successMessage="Compra cancelada"
			reasonRequired={false}
			placeholder="Ex.: lançada em dobro"
			mutation={useCancelPurchase(purchase.id)}
		/>
	);
}
