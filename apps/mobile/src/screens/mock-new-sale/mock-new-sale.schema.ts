import { z } from "zod";

export const PAYMENTS = [
	{ value: "pix", label: "Pix" },
	{ value: "cash", label: "Dinheiro" },
	{ value: "credit", label: "Crédito" },
	{ value: "debit", label: "Débito" },
] as const;

export const newSaleSchema = z.object({
	customer: z.string().trim().min(2, "Informe o nome da cliente"),
	payment: z.enum(["pix", "cash", "credit", "debit"], {
		error: "Escolha a forma de pagamento",
	}),
	items: z
		.array(z.object({ sku: z.string(), quantity: z.number().int().positive() }))
		.min(1, "Adicione pelo menos um produto"),
	discount: z
		.number({ error: "Desconto inválido" })
		.min(0, "Desconto inválido")
		.optional(),
});

export type Payment = (typeof PAYMENTS)[number]["value"];
export type CartItem = { sku: string; quantity: number };
