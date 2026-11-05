import { useState } from "react";
import { ConfirmSheet } from "@/components/confirm-sheet";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import type { SaleDetail } from "@/queries/sales/sales.types";
import { useCancelSale } from "@/queries/sales/use-sales";

/**
 * Cancel a sale (vendas.md): the user confirms and gives the reason. Units go back to the same expiries, the average
 * cost doesn't change, and the sale stays visible, marked, out of sales, profit and commissions.
 */
export function CancelSale({ sale }: { sale: SaleDetail }) {
	const [confirming, setConfirming] = useState(false);
	const [reason, setReason] = useState("");
	const [attempted, setAttempted] = useState(false);
	const cancel = useCancelSale(sale.id);
	const close = () => {
		cancel.reset();
		setReason("");
		setAttempted(false);
		setConfirming(false);
	};
	const submit = () => {
		setAttempted(true);
		if (reason.trim() && !cancel.isPending) {
			cancel.mutate(reason.trim(), { onSuccess: close });
		}
	};

	if (sale.status === "canceled") return null;

	return (
		<>
			<Button variant="ghost" onPress={() => setConfirming(true)}>
				<Text className="text-destructive">Cancelar venda</Text>
			</Button>
			<ConfirmSheet
				open={confirming}
				onClose={close}
				title={`Cancelar a venda #${sale.number}?`}
				description="As unidades voltam para o estoque e a venda sai dos relatórios e das comissões. Ela continua na lista, marcada como cancelada. Venda não é editada: se estava errada, lance de novo depois."
				confirmLabel="Cancelar venda"
				pending={cancel.isPending}
				error={cancel.error}
				onConfirm={submit}
			>
				<FormField
					label="Motivo"
					value={reason}
					onChangeText={setReason}
					error={attempted && !reason.trim() ? "Informe o motivo." : undefined}
					placeholder="Ex.: cliente desistiu"
				/>
			</ConfirmSheet>
		</>
	);
}
