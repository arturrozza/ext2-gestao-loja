import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { ScreenLayout } from "@/components/screen-layout";
import { Text } from "@/components/ui/text";
import { HOME_GLOW } from "@/lib/theme";
import { homeSections } from "./partials/home-shortcuts";
import { ProfitHighlight } from "./partials/profit-highlight";
import { ShortcutCarousel } from "./partials/shortcut-carousel";

function greeting() {
	const hour = new Date().getHours();
	if (hour < 12) return "Bom dia";
	if (hour < 18) return "Boa tarde";
	return "Boa noite";
}

/** Greeting row. Lives inside the scroll content so it scrolls away with the page. */
function HomeGreeting() {
	return (
		<View className="flex-row items-center gap-3 pt-2">
			<View className="h-10 w-10 items-center justify-center rounded-full bg-background">
				<Text className="font-sans-semibold text-primary text-xs">MM</Text>
			</View>
			<View className="flex-1">
				<Text className="text-muted-foreground text-xs">{greeting()},</Text>
				<Text className="font-sans-semibold text-base" numberOfLines={1}>
					Mundo Madam Cosméticos
				</Text>
			</View>
		</View>
	);
}

/**
 * Home (light-gray page, white cards): month summary on top, then one carousel of shortcuts per group of modules.
 * Empty store: zeroed summary and "nothing yet" subtitles.
 */
export function MockDashboardScreen() {
	// Mock only: `?empty=1` previews the home of a store that just started.
	const { empty } = useLocalSearchParams<{ empty?: string }>();
	const isEmpty = empty === "1";

	return (
		<ScreenLayout
			bottom="tabs"
			tone="muted"
			compactTitle="Início"
			contentClassName="gap-7 pt-3"
		>
			<LinearGradient
				pointerEvents="none"
				colors={HOME_GLOW}
				locations={[0, 0.3, 0.75, 1]}
				style={styles.glow}
			/>
			<HomeGreeting />
			<ProfitHighlight empty={isEmpty} />
			{homeSections(isEmpty).map((section) => (
				<ShortcutCarousel key={section.title} section={section} />
			))}
		</ScreenLayout>
	);
}

// Behind the whole page content; scrolls with it. Negative offsets reach the status bar and
// the screen edges (the content has 20px side padding).
const styles = StyleSheet.create({
	glow: { position: "absolute", top: -120, left: -20, right: -20, bottom: 0 },
});
