import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { UnderConstructionTag } from "@/components/under-construction";
import type { PurchaseDetail } from "@/queries/purchases/purchases.types";

/**
 * Cancel a purchase (compras.md): stock and average cost go back as if it never existed; it stays in the history,
 * marked. Under construction until MUN-17 (the API has no cancellation yet): the action shows, disabled and tagged.
 * MUN-17 brings the confirmation and the "can't cancel, units already sold" state.
 */
export function CancelPurchase({ purchase }: { purchase: PurchaseDetail }) {
	if (purchase.status === "canceled") return null;
	return (
		<Button variant="ghost" disabled>
			<Text className="text-destructive">Cancelar compra</Text>
			<UnderConstructionTag />
		</Button>
	);
}
