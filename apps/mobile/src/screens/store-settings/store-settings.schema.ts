import { z } from "zod";
import { percentField } from "@/lib/form-fields";

const days = (label: string) =>
	z.string().transform((text, ctx) => {
		const value = Number(text);
		if (!/^\d+$/.test(text.trim()) || value < 1 || value > 365) {
			ctx.addIssue({
				code: "custom",
				message: `Informe ${label} entre 1 e 365 dias.`,
			});
			return z.NEVER;
		}
		return value;
	});

export const storeSettingsSchema = z.object({
	defaultTaxPercent: percentField("Informe o imposto entre 0 e 100%."),
	mercadoLivreFeePercent: percentField("Informe a taxa entre 0 e 100%."),
	expiryWarningDays: days("o aviso"),
	staleProductDays: days("o período"),
	lowMarginPercent: percentField("Informe o limite entre 0 e 100%."),
});
