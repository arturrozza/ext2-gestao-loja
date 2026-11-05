import { router } from "expo-router";
import { FormField } from "@/components/form-field";
import { FormScreen } from "@/components/form-screen";
import { FormSection } from "@/components/form-section";
import { showToast } from "@/components/toast";
import { useZodForm } from "@/lib/use-zod-form";
import { useChangePassword } from "@/queries/auth/use-auth";
import { changePasswordSchema } from "./change-password.schema";

/** Change the password while signed in: current password, new one twice. */
export function ChangePasswordScreen() {
	const change = useChangePassword();
	const form = useZodForm(changePasswordSchema, {
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});

	const submit = form.handleSubmit(({ currentPassword, newPassword }) =>
		change.mutate(
			{ currentPassword, newPassword },
			{
				onSuccess: () => {
					showToast("Senha alterada");
					router.back();
				},
				onError: form.applyApiError,
			},
		),
	);

	return (
		<FormScreen
			title="Trocar senha"
			error={form.footerError(change.error)}
			pending={change.isPending}
			submitLabel="Trocar senha"
			onSubmit={submit}
		>
			<FormSection>
				<FormField
					label="Senha atual"
					placeholder="A senha que você usa hoje"
					value={form.values.currentPassword}
					onChangeText={(text) => form.set("currentPassword", text)}
					error={form.errors.currentPassword}
					secureTextEntry
					autoComplete="current-password"
					textContentType="password"
				/>
				<FormField
					label="Nova senha"
					placeholder="Escolha uma senha nova"
					value={form.values.newPassword}
					onChangeText={(text) => form.set("newPassword", text)}
					error={form.errors.newPassword}
					hint="Pelo menos 8 caracteres."
					secureTextEntry
					autoComplete="new-password"
					textContentType="newPassword"
				/>
				<FormField
					label="Repita a nova senha"
					placeholder="A mesma senha de novo"
					value={form.values.confirmPassword}
					onChangeText={(text) => form.set("confirmPassword", text)}
					error={form.errors.confirmPassword}
					secureTextEntry
					autoComplete="new-password"
					textContentType="newPassword"
				/>
			</FormSection>
		</FormScreen>
	);
}
