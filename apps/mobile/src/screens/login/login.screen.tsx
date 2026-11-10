import { EnvelopeIcon } from "phosphor-react-native/src/icons/Envelope";
import { LockIcon } from "phosphor-react-native/src/icons/Lock";
import { type ComponentRef, useRef } from "react";
import type { TextInput } from "react-native";
import { FormField } from "@/components/form-field";
import { FormScreen } from "@/components/form-screen";
import { FormSection } from "@/components/form-section";
import { Text } from "@/components/ui/text";
import { useZodForm } from "@/lib/use-zod-form";
import { useSignIn } from "@/queries/auth/use-auth";
import { loginSchema } from "./login.schema";

/**
 * Sign in with e-mail and password, as a sheet over the welcome screen (docs/product/acesso.md). The root guard
 * swaps to the app once the session arrives. A forgotten password is reset by the team.
 */
export function LoginScreen() {
	const signIn = useSignIn();
	const form = useZodForm(loginSchema, { email: "", password: "" });
	const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

	const submit = form.handleSubmit((data) => {
		if (!signIn.isPending) signIn.mutate(data);
	});

	return (
		<FormScreen
			title="Entrar"
			error={form.footerError(signIn.error)}
			pending={signIn.isPending}
			submitLabel="Entrar"
			onSubmit={submit}
		>
			<FormSection>
				<FormField
					label="E-mail"
					icon={EnvelopeIcon}
					placeholder="voce@email.com"
					value={form.values.email}
					onChangeText={(text) => form.set("email", text)}
					error={form.errors.email}
					keyboardType="email-address"
					autoCapitalize="none"
					autoCorrect={false}
					autoComplete="email"
					textContentType="username"
					returnKeyType="next"
					submitBehavior="submit"
					onSubmitEditing={() => passwordRef.current?.focus()}
				/>
				<FormField
					ref={passwordRef}
					label="Senha"
					icon={LockIcon}
					placeholder="Sua senha"
					value={form.values.password}
					onChangeText={(text) => form.set("password", text)}
					error={form.errors.password}
					password
					autoComplete="current-password"
					textContentType="password"
					returnKeyType="go"
					onSubmitEditing={submit}
				/>
			</FormSection>
			<Text className="px-4 text-center text-muted-foreground text-xs">
				Esqueceu a senha? Fale com quem configurou o app para redefinir.
			</Text>
		</FormScreen>
	);
}
