import { z } from "zod";
import { optionalPhone, optionalText } from "@/lib/form-fields";
import { onlyDigits } from "@/lib/masks";

/** Same limits as the API (`StoreModel.profile`), so the message names the problem instead of a generic one. */
const atMost = (max: number) => (value: string | null) =>
	value === null || value.length <= max;

export const storeEditSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Informe o nome da loja.")
		.max(120, "O nome pode ter no máximo 120 caracteres."),
	document: optionalText.refine(
		(value) => value === null || [11, 14].includes(onlyDigits(value).length),
		"Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).",
	),
	phone: optionalPhone,
	address: optionalText.refine(
		atMost(300),
		"O endereço pode ter no máximo 300 caracteres.",
	),
});
