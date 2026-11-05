import "../global.css";

import { PortalHost } from "@rn-primitives/portal";
import { Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ToastHost } from "@/components/toast";
import { useAppFonts } from "@/lib/fonts";
import { NAV_THEME } from "@/lib/theme";
import { AppProviders } from "@/providers/app-providers";
import { useSession } from "@/queries/auth/use-auth";

SplashScreen.preventAutoHideAsync();

/** Only the login screen is reachable without a session (docs/product/acesso-e-loja.md). */
function RootStack() {
	const fontsReady = useAppFonts();
	const session = useSession();
	const ready = fontsReady && !session.isPending;

	useEffect(() => {
		if (ready) SplashScreen.hideAsync();
	}, [ready]);

	if (!ready) return null;

	const signedIn = session.data != null;

	return (
		<Stack screenOptions={{ headerShown: false, animation: "ios_from_right" }}>
			<Stack.Protected guard={signedIn}>
				<Stack.Screen name="(app)" />
			</Stack.Protected>
			<Stack.Protected guard={!signedIn}>
				<Stack.Screen name="login" />
			</Stack.Protected>
		</Stack>
	);
}

export default function RootLayout() {
	return (
		<AppProviders>
			<ThemeProvider value={NAV_THEME}>
				<StatusBar style="dark" />
				<RootStack />
				<PortalHost />
				<ToastHost />
			</ThemeProvider>
		</AppProviders>
	);
}
