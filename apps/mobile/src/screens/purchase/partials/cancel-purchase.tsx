import { useState } from "react";
import { View } from "react-native";
import { ConfirmSheet } from "@/components/confirm-sheet";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import type { PurchaseDetail } from "@/queries/purchases/purchases.types";
import { useCancelPurchase } from "@/queries/purchases/use-purchases";

/**
 * Cancel a purchase (compras.md): stock and average cost go back as if it never existed; it stays in the history,
 * marked. Blocked once any unit of it was sold: then the fix is an adjustment or a cost correction.
 */
export function CancelPurchase({ purchase }: { purchase: PurchaseDetail }) {
	const [confirming, setConfirming] = useState(false);
	const cancel = useCancelPurchase(purchase.id);
	const close = () => {
		cancel.reset();
		setConfirming(false);
	};

	if (purchase.status === "canceled") return null;
	if (purchase.cancelBlockedReason) {
		return (
			<View className="rounded-2xl bg-background p-4">
				<Text className="font-sans-semibold text-sm">Não dá para cancelar</Text>
				<Text className="mt-1 text-muted-foreground text-sm">
					{purchase.cancelBlockedReason}
				</Text>
			</View>
		);
	}

	return (
		<>
			<Button variant="ghost" onPress={() => setConfirming(true)}>
				<Text className="text-destructive">Cancelar compra</Text>
			</Button>
			<ConfirmSheet
				open={confirming}
				onClose={close}
				title={`Cancelar a compra #${purchase.number}?`}
				description="As unidades saem do estoque e o custo médio volta a ser o de antes. A compra continua no histórico, marcada como cancelada. Se ela estava errada, lance de novo depois."
				confirmLabel="Cancelar compra"
				pending={cancel.isPending}
				error={cancel.error}
				onConfirm={() => cancel.mutate(undefined, { onSuccess: close })}
			/>
		</>
	);
}
