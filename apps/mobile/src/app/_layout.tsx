import "../global.css";

import { PortalHost } from "@rn-primitives/portal";
import { Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { AnimatedSplash } from "@/components/animated-splash";
import { ErrorState } from "@/components/query-states";
import { ToastHost } from "@/components/toast";
import { useAppFonts } from "@/lib/fonts";
import { SHEET } from "@/lib/navigation";
import { NAV_THEME } from "@/lib/theme";
import { AppProviders } from "@/providers/app-providers";
import { useSession } from "@/queries/auth/use-auth";

SplashScreen.preventAutoHideAsync();

/** Only the welcome and login screens are reachable without a session (docs/product/acesso.md). */
function Screens({ session }: { session: ReturnType<typeof useSession> }) {
	// A saved session that couldn't be checked (no internet on a cold start) isn't a signed-out user: offer a retry
	// instead of dropping them on the welcome screen.
	if (session.data === undefined) {
		return (
			<View className="flex-1 justify-center bg-card">
				<ErrorState error={session.error} onRetry={() => session.refetch()} />
			</View>
		);
	}

	const signedIn = session.data != null;

	return (
		<Stack screenOptions={{ headerShown: false, animation: "ios_from_right" }}>
			{/* Without `redirectTo` the router falls back to the first route in file order, which is `login`. */}
			<Stack.Protected guard={signedIn} redirectTo="/welcome">
				<Stack.Screen name="(app)" />
			</Stack.Protected>
			<Stack.Protected guard={!signedIn}>
				<Stack.Screen name="welcome" />
				<Stack.Screen name="login" options={SHEET} />
			</Stack.Protected>
		</Stack>
	);
}

/** The native splash stays up until fonts and session are loaded; then the animated one takes over and leaves. */
function RootStack() {
	const fontsReady = useAppFonts();
	const session = useSession();

	if (!fontsReady || session.isPending) return null;

	return (
		<>
			<Screens session={session} />
			<AnimatedSplash />
		</>
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
