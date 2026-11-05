import { type ComponentRef, useRef } from "react";
import { type TextInput, View } from "react-native";
import { FormField } from "@/components/form-field";
import { ScreenLayout } from "@/components/screen-layout";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { errorMessage } from "@/lib/errors";
import { useZodForm } from "@/lib/use-zod-form";
import { useSignIn } from "@/queries/auth/use-auth";
import { loginSchema } from "./login.schema";
import { DemoLoginHint } from "./partials/demo-login-hint";

/**
 * Sign in with e-mail and password (docs/product/acesso-e-loja.md). Accounts are created by the team, so there's no
 * sign-up; a forgotten password is reset by the team too.
 */
export function LoginScreen() {
	const signIn = useSignIn();
	const form = useZodForm(loginSchema, { email: "", password: "" });

	const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
	const submit = form.handleSubmit((data) => {
		if (!signIn.isPending) signIn.mutate(data);
	});

	return (
		<ScreenLayout compactTitle="Entrar" contentClassName="gap-7 pt-16">
			<View className="gap-1 px-1">
				<Text className="font-sans-semibold text-[26px] leading-tight tracking-tight">
					Entrar
				</Text>
				<Text className="text-muted-foreground text-sm">
					Use o e-mail e a senha da sua loja.
				</Text>
			</View>

			<View className="gap-4 rounded-2xl bg-background p-4">
				<FormField
					label="E-mail"
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
					placeholder="Sua senha"
					value={form.values.password}
					onChangeText={(text) => form.set("password", text)}
					error={form.errors.password}
					secureTextEntry
					autoComplete="current-password"
					textContentType="password"
					returnKeyType="go"
					onSubmitEditing={submit}
				/>
			</View>

			<View className="gap-3">
				{signIn.error ? (
					<Text className="text-center text-destructive text-sm">
						{errorMessage(signIn.error)}
					</Text>
				) : null}
				<Button size="lg" onPress={submit} loading={signIn.isPending}>
					<Text>Entrar</Text>
				</Button>
				<Text className="px-4 text-center text-muted-foreground text-xs">
					Esqueceu a senha? Fale com a equipe que configurou o app para
					redefinir.
				</Text>
			</View>

			<DemoLoginHint
				onFill={(email, password) => form.setValues({ email, password })}
			/>
		</ScreenLayout>
	);
}
