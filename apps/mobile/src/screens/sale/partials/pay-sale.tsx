import { useState } from "react";
import { ConfirmSheet } from "@/components/confirm-sheet";
import { DateField } from "@/components/date-field";
import { SelectField } from "@/components/select-field";
import { showToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { formatDate, fromISODate, todayISODate } from "@/lib/dates";
import { useZodForm } from "@/lib/use-zod-form";
import type { SaleDetail } from "@/queries/sales/sales.types";
import { usePaySale, useUnpaySale } from "@/queries/sales/use-sales";
import { METHOD_OPTIONS } from "../../new-sale/partials/sale-options";
import { type PayFormValues, payFormSchema } from "./pay-sale.schema";

const initialValues = (): PayFormValues => ({
	paidAt: formatDate(todayISODate()),
	paymentMethod: undefined,
});

/** Mark a term sale as paid, all at once, with the day and the method (vendas.md, RF-VEN-19). */
function MarkPaid({ sale }: { sale: SaleDetail }) {
	const [open, setOpen] = useState(false);
	const pay = usePaySale(sale.id);
	const form = useZodForm(payFormSchema(sale.date), initialValues());
	const { values, errors, set } = form;
	const start = () => {
		form.reset();
		setOpen(true);
	};
	const close = () => {
		pay.reset();
		setOpen(false);
	};
	const submit = form.handleSubmit((data) =>
		pay.mutate(data, {
			onSuccess: () => {
				close();
				showToast("Venda marcada como paga");
			},
			onError: form.applyApiError,
		}),
	);

	return (
		<>
			<Button onPress={start}>
				<Text>Marcar como paga</Text>
			</Button>
			<ConfirmSheet
				open={open}
				onClose={pay.isPending ? () => undefined : close}
				title={`Venda #${sale.number} paga?`}
				description="Informe quando e como o cliente pagou. A receita e o lucro da venda não mudam."
				confirmLabel="Marcar como paga"
				confirmVariant="default"
				pending={pay.isPending}
				error={form.footerError(pay.error) ? pay.error : undefined}
				onConfirm={submit}
			>
				<DateField
					label="Data do pagamento"
					value={values.paidAt}
					onChange={(paidAt) => set("paidAt", paidAt)}
					error={errors.paidAt}
					minimumDate={fromISODate(sale.date)}
					maximumDate={new Date()}
				/>
				<SelectField
					label="Forma de pagamento"
					options={METHOD_OPTIONS}
					value={values.paymentMethod}
					onChange={(method) => set("paymentMethod", method)}
					placeholder="Escolher"
					error={errors.paymentMethod}
				/>
			</ConfirmSheet>
		</>
	);
}

/** Take the payment back (vendas.md, RF-VEN-20): the day and the method are cleared. */
function MarkUnpaid({ sale }: { sale: SaleDetail }) {
	const [open, setOpen] = useState(false);
	const unpay = useUnpaySale(sale.id);
	const close = () => {
		unpay.reset();
		setOpen(false);
	};
	const confirm = () =>
		unpay.mutate(undefined, {
			onSuccess: () => {
				close();
				showToast("Pagamento desfeito");
			},
		});

	return (
		<>
			<Button variant="outline" onPress={() => setOpen(true)}>
				<Text>Voltar para não paga</Text>
			</Button>
			<ConfirmSheet
				open={open}
				onClose={unpay.isPending ? () => undefined : close}
				title={`Venda #${sale.number} não paga?`}
				description="A data e a forma do pagamento são apagadas. A receita e o lucro da venda não mudam."
				confirmLabel="Voltar para não paga"
				pending={unpay.isPending}
				error={unpay.error ?? undefined}
				onConfirm={confirm}
			/>
		</>
	);
}

/** The payment of a term sale that isn't canceled: mark it paid, or take it back. */
export function PaySale({ sale }: { sale: SaleDetail }) {
	if (sale.paymentCondition !== "term" || sale.status === "canceled")
		return null;
	return sale.paidAt ? <MarkUnpaid sale={sale} /> : <MarkPaid sale={sale} />;
}
