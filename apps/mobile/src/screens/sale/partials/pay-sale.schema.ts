import { z } from "zod";
import { type ISODate, parseDateInput, todayISODate } from "@/lib/dates";
import type { PaymentMethod } from "@/queries/sales/sales.types";

export type PayFormValues = {
	/** "dd/mm/aaaa". */
	paidAt: string;
	paymentMethod: PaymentMethod | undefined;
};

type Ctx = z.RefinementCtx;

function fail(ctx: Ctx, path: string, message: string) {
	ctx.addIssue({ code: "custom", path: [path], message });
}

/** The day of the payment: a real day, not in the future, not before the sale (vendas.md, RN-VEN-30). */
function parsePaidAt(text: string, saleDate: ISODate, ctx: Ctx) {
	const day = parseDateInput(text);
	if (!day) {
		fail(ctx, "paidAt", "Data inválida (dd/mm/aaaa).");
		return null;
	}
	if (day > todayISODate()) {
		fail(ctx, "paidAt", "A data do pagamento não pode ser futura.");
		return null;
	}
	if (day < saleDate) {
		fail(ctx, "paidAt", "O pagamento não pode ser antes da venda.");
		return null;
	}
	return day;
}

/** Marking a term sale as paid → API input. */
export const payFormSchema = (saleDate: ISODate) =>
	z.custom<PayFormValues>().transform((values, ctx) => {
		const paidAt = parsePaidAt(values.paidAt, saleDate, ctx);
		if (!values.paymentMethod)
			fail(ctx, "paymentMethod", "Escolha a forma de pagamento.");
		if (!paidAt || !values.paymentMethod) return z.NEVER;
		return { paidAt, paymentMethod: values.paymentMethod };
	});
