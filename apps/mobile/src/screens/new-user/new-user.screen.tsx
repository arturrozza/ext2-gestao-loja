import { router } from "expo-router";
import { DiscardGuard } from "@/components/discard-guard";
import { FormField } from "@/components/form-field";
import { FormScreen } from "@/components/form-screen";
import { FormSection } from "@/components/form-section";
import { showToast } from "@/components/toast";
import { useZodForm } from "@/lib/use-zod-form";
import { useCreateUser } from "@/queries/users/use-users";
import { newUserSchema } from "./new-user.schema";

/** A new person who can sign in to the store. They get the e-mail and password from whoever created them. */
export function NewUserScreen() {
	const create = useCreateUser();
	const form = useZodForm(newUserSchema, {
		name: "",
		email: "",
		password: "",
		confirmPassword: "",
	});
	const dirty = Object.values(form.values).some((value) => value !== "");

	const submit = form.handleSubmit(({ name, email, password }) =>
		create.mutate(
			{ name, email, password },
			{
				onSuccess: () => {
					showToast("Usuário criado");
					router.back();
				},
				onError: form.applyApiError,
			},
		),
	);

	return (
		<FormScreen
			title="Novo usuário"
			error={form.footerError(create.error)}
			pending={create.isPending}
			submitLabel="Criar usuário"
			onSubmit={submit}
		>
			<FormSection>
				<FormField
					label="Nome"
					placeholder="Como a pessoa se chama"
					value={form.values.name}
					onChangeText={(text) => form.set("name", text)}
					error={form.errors.name}
					autoCapitalize="words"
					textContentType="name"
				/>
				<FormField
					label="E-mail"
					placeholder="pessoa@email.com"
					value={form.values.email}
					onChangeText={(text) => form.set("email", text)}
					error={form.errors.email}
					keyboardType="email-address"
					autoCapitalize="none"
					autoCorrect={false}
					textContentType="emailAddress"
				/>
				<FormField
					label="Senha"
					placeholder="A senha que ela vai usar"
					value={form.values.password}
					onChangeText={(text) => form.set("password", text)}
					error={form.errors.password}
					hint="Pelo menos 8 caracteres. A pessoa pode trocar depois."
					secureTextEntry
					autoComplete="new-password"
					textContentType="newPassword"
				/>
				<FormField
					label="Repita a senha"
					placeholder="A mesma senha de novo"
					value={form.values.confirmPassword}
					onChangeText={(text) => form.set("confirmPassword", text)}
					error={form.errors.confirmPassword}
					secureTextEntry
					autoComplete="new-password"
					textContentType="newPassword"
				/>
			</FormSection>
			<DiscardGuard
				dirty={dirty && !create.isPending && !create.isSuccess}
				title="Descartar o novo usuário?"
				description="O que você preencheu vai ser perdido."
			/>
		</FormScreen>
	);
}
