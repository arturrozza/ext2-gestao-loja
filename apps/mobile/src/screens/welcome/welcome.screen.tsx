import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { FADE_MUTED } from "@/lib/theme";

// Unsplash (free license): a minimal shop with products on shelves, neutral tones that melt into the light page.
const HERO = require("../../../assets/images/hero-welcome.jpg");
const ICON = require("../../../assets/images/icon.png");

/**
 * First screen without a session: a photo that melts into the page, what the app is, and one big button to sign in.
 * There's no sign-up: accounts are created by someone who already uses the app (docs/product/acesso.md).
 */
export function WelcomeScreen() {
	const { height } = useWindowDimensions();

	return (
		<View className="flex-1 bg-card">
			{/* Runs under the status bar, so this screen handles its own safe area instead of ScreenLayout. */}
			<View style={{ height: height * 0.6 }}>
				<Image
					source={HERO}
					contentFit="cover"
					style={{ position: "absolute", inset: 0 }}
					accessibilityIgnoresInvertColors
				/>
				<LinearGradient
					colors={[FADE_MUTED.clear, FADE_MUTED.half, FADE_MUTED.solid]}
					locations={[0.55, 0.8, 1]}
					style={{ position: "absolute", inset: 0 }}
				/>
			</View>

			{/* Text and button sit together at the bottom, close to the thumb. */}
			<SafeAreaView edges={["bottom"]} className="flex-1 justify-end">
				<View className="gap-8 px-5 pb-3">
					<View className="gap-3 px-1">
						<View className="flex-row items-center gap-2.5">
							<Image
								source={ICON}
								style={{ width: 36, height: 36, borderRadius: 9 }}
								accessibilityLabel="Ícone do MM Vendas"
							/>
							<Text className="font-sans-semibold text-primary text-sm">
								MM Vendas
							</Text>
						</View>
						<Text className="font-sans-semibold text-[26px] leading-[32px] tracking-tight">
							{"Sua loja inteira\nna palma da mão."}
						</Text>
						<Text className="text-muted-foreground text-sm leading-snug">
							Vendas, estoque, compras e lucro, tudo num lugar só.
						</Text>
					</View>

					<View className="gap-4">
						<Link href="/login" asChild>
							<Button size="lg">
								<Text>Entrar</Text>
							</Button>
						</Link>
						<Text className="px-6 text-center text-muted-foreground text-xs">
							Ainda não tem acesso? Peça para quem já usa o app criar o seu
							usuário.
						</Text>
					</View>
				</View>
			</SafeAreaView>
		</View>
	);
}
