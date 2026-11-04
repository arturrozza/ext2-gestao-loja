import { Link } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticTap } from "@/lib/haptics";
import type { Shortcut, ShortcutSection } from "./home-shortcuts";

function PendingBadge({ count }: { count: number }) {
	return (
		<View className="h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5">
			<Text className="font-sans-semibold text-[11px] text-destructive-foreground leading-none">
				{count}
			</Text>
		</View>
	);
}

function ShortcutCard({ item }: { item: Shortcut }) {
	const badge = item.badge ?? 0;

	return (
		<Link href={item.href} asChild>
			<Pressable
				onPress={hapticTap}
				accessibilityRole="button"
				accessibilityLabel={
					badge > 0 ? `${item.title}, ${badge} pendentes` : item.title
				}
				className="h-[120px] w-[120px] justify-between rounded-2xl bg-background p-3.5 active:bg-accent"
			>
				<View className="flex-row items-start justify-between">
					<Icon as={item.icon} size={22} className="text-foreground/50" />
					{badge > 0 ? <PendingBadge count={badge} /> : null}
				</View>
				<View className="gap-0.5">
					<Text className="font-sans-semibold text-sm" numberOfLines={1}>
						{item.title}
					</Text>
					<Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
						{item.subtitle}
					</Text>
				</View>
			</Pressable>
		</Link>
	);
}

/** Section title + a horizontal row of shortcut cards that bleeds to the screen edges. */
export function ShortcutCarousel({ section }: { section: ShortcutSection }) {
	return (
		<View className="gap-3">
			<Text className="px-1 font-sans-semibold text-base">{section.title}</Text>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				className="-mx-5"
				contentContainerClassName="gap-2.5 px-5"
			>
				{section.items.map((item) => (
					<ShortcutCard key={item.title} item={item} />
				))}
			</ScrollView>
		</View>
	);
}
