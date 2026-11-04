import { z } from "zod";

export const CATEGORIES = [
	{ value: "perfumes", label: "Perfumes" },
	{ value: "maquiagem", label: "Maquiagem" },
	{ value: "skincare", label: "Skincare" },
	{ value: "cabelos", label: "Cabelos" },
	{ value: "corpo", label: "Corpo" },
] as const;

const quantity = (label: string) =>
	z
		.number({ error: `Informe ${label}` })
		.int("Use um número inteiro")
		.min(0, "Não pode ser negativo");

export const newProductSchema = z
	.object({
		name: z.string().trim().min(2, "Informe o nome do produto"),
		sku: z.string().trim().min(3, "Use pelo menos 3 caracteres"),
		price: z
			.number({ error: "Informe o preço" })
			.positive("O preço precisa ser maior que zero"),
		cost: z
			.number({ error: "Informe o custo" })
			.min(0, "Não pode ser negativo"),
		stock: quantity("o estoque inicial"),
		minStock: quantity("o estoque mínimo"),
		category: z.string({ error: "Escolha uma categoria" }),
	})
	.refine((product) => product.cost <= product.price, {
		path: ["cost"],
		message: "O custo está maior que o preço",
	});

export type Category = (typeof CATEGORIES)[number]["value"];
