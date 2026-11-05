import { z } from "zod";

export const newUserSchema = z
	.object({
		name: z.string().trim().min(1, "Informe o nome."),
		email: z.string().trim().pipe(z.email("Informe um e-mail válido.")),
		password: z
			.string()
			.min(8, "A senha precisa de pelo menos 8 caracteres.")
			.max(128, "A senha pode ter no máximo 128 caracteres."),
		confirmPassword: z.string(),
	})
	.refine((data) => data.confirmPassword === data.password, {
		path: ["confirmPassword"],
		message: "As senhas não são iguais.",
	});
