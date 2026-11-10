import { z } from "zod";
import { onlyDigits } from "@/lib/masks";
import { parsePercentInput } from "@/lib/money";

/** Optional free text: trimmed, and `null` when empty. */
export const optionalText = z
	.string()
	.trim()
	.transform((value) => value || null);

/** Optional free-text address (the store's, a customer's), with the API's limit so the message names the problem. */
export const optionalAddress = optionalText.refine(
	(value) => value === null || value.length <= 300,
	"O endereço pode ter no máximo 300 caracteres.",
);

export const optionalPhone = optionalText.refine(
	(value) => value === null || [10, 11].includes(onlyDigits(value).length),
	"Informe o telefone com DDD.",
);

/** Percentage typed in pt-BR ("12,5"), from 0 to 100. Outputs basis points (1250), as the API takes it. */
export function percentField(message: string) {
	return z.string().transform((text, ctx) => {
		const value = parsePercentInput(text);
		if (value === null) {
			ctx.addIssue({ code: "custom", message });
			return z.NEVER;
		}
		return value;
	});
}
