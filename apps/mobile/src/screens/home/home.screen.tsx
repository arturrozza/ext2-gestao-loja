import { Link } from "expo-router";
import { Pressable, View } from "react-native";
import { QueryView } from "@/components/query-states";
import { ScreenLayout } from "@/components/screen-layout";
import { SummarySkeleton } from "@/components/skeleton";
import { Text } from "@/components/ui/text";
import { hapticTap } from "@/lib/haptics";
import { initials } from "@/lib/masks";
import { useSession } from "@/queries/auth/use-auth";
import { useHomeShortcuts } from "./partials/home-shortcuts";
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
	const session = useSession();
	const storeName = session.data?.store.name ?? "";

	return (
		<Link href="/store" asChild>
			<Pressable
				onPress={hapticTap}
				accessibilityRole="button"
				accessibilityLabel={`${storeName}, abrir dados da loja`}
				className="flex-row items-center gap-3 pt-2"
			>
				<View className="h-10 w-10 items-center justify-center rounded-full bg-background">
					<Text className="font-sans-semibold text-primary text-xs">
						{initials(storeName)}
					</Text>
				</View>
				<View className="flex-1">
					<Text className="text-muted-foreground text-xs">{greeting()},</Text>
					<Text className="font-sans-semibold text-base" numberOfLines={1}>
						{storeName}
					</Text>
				</View>
			</Pressable>
		</Link>
	);
}

/**
 * Home (light-gray page, white cards): month summary on top, then one carousel of shortcuts per group of modules.
 * A store that just started sees a zeroed summary and "nothing yet" subtitles.
 */
export function HomeScreen() {
	const home = useHomeShortcuts();

	return (
		<ScreenLayout
			bottom="tabs"
			tone="muted"
			compactTitle="Início"
			onRefresh={home.refetch}
			contentClassName="gap-7 pt-3"
		>
			<HomeGreeting />
			<QueryView query={home.summary} skeleton={<SummarySkeleton />}>
				{(summary) => <ProfitHighlight summary={summary} />}
			</QueryView>
			{home.sections.map((section) => (
				<ShortcutCarousel
					key={section.title}
					section={section}
					failed={home.failed}
				/>
			))}
		</ScreenLayout>
	);
}
