import { z } from "zod";
import { optionalPhone, optionalText } from "@/lib/form-fields";
import { onlyDigits } from "@/lib/masks";

export const storeEditSchema = z.object({
	name: z.string().trim().min(1, "Informe o nome da loja."),
	document: optionalText.refine(
		(value) => value === null || [11, 14].includes(onlyDigits(value).length),
		"Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).",
	),
	phone: optionalPhone,
	address: optionalText,
});
