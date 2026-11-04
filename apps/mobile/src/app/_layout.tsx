import "../global.css";

import { PortalHost } from "@rn-primitives/portal";
import { Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useAppFonts } from "@/lib/fonts";
import { NAV_THEME } from "@/lib/theme";
import { AppProviders } from "@/providers/app-providers";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
	const fontsReady = useAppFonts();

	useEffect(() => {
		if (fontsReady) SplashScreen.hideAsync();
	}, [fontsReady]);

	if (!fontsReady) return null;

	return (
		<AppProviders>
			<ThemeProvider value={NAV_THEME}>
				<StatusBar style="dark" />
				<Stack
					screenOptions={{ headerShown: false, animation: "ios_from_right" }}
				/>
				<PortalHost />
			</ThemeProvider>
		</AppProviders>
	);
}
