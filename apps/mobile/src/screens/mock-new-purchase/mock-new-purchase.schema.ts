import { z } from "zod";

export const newPurchaseSchema = z.object({
	sku: z.string({ error: "Escolha o produto" }),
	quantity: z
		.number({ error: "Informe a quantidade" })
		.int("Use um número inteiro")
		.positive("Precisa ser maior que zero"),
	unitCost: z
		.number({ error: "Informe o custo unitário" })
		.min(0, "Não pode ser negativo"),
	expiry: z
		.string()
		.trim()
		.regex(/^(0[1-9]|1[0-2])\/\d{4}$/, "Use o formato MM/AAAA")
		.optional(),
});
