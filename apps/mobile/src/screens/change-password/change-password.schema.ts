import { z } from "zod";

export const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, "Informe a senha atual."),
		newPassword: z
			.string()
			.min(8, "A nova senha precisa de pelo menos 8 caracteres.")
			.max(128, "A nova senha pode ter no máximo 128 caracteres."),
		confirmPassword: z.string(),
	})
	.refine((data) => data.confirmPassword === data.newPassword, {
		path: ["confirmPassword"],
		message: "As senhas não são iguais.",
	})
	.refine((data) => data.newPassword !== data.currentPassword, {
		path: ["newPassword"],
		message: "A nova senha precisa ser diferente da atual.",
	});
