import { z } from "zod";
import { fromCents, parseMoneyInput } from "@/lib/money";

/** Cost correction (estoque.md): the right cost and why. */
export const correctCostSchema = z.object({
	newCost: z.string().transform((text, ctx) => {
		const cents = parseMoneyInput(text);
		if (cents === null) {
			ctx.addIssue({ code: "custom", message: "Informe o custo certo." });
			return z.NEVER;
		}
		return fromCents(cents);
	}),
	note: z.string().trim().min(1, "Informe o motivo da correção."),
});
