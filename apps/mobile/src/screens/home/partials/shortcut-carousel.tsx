import { Link } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticTap } from "@/lib/haptics";
import type { Shortcut, ShortcutSection } from "./home-shortcuts";

/** Under the title: the module's number, or a placeholder of the same height while the number loads. */
function ShortcutSubtitle({
	item,
	failed,
}: {
	item: Shortcut;
	failed: boolean;
}) {
	if (!item.subtitle && !failed) {
		// Same height as the text line it stands for, so the card doesn't move when the numbers arrive.
		return (
			<View className="h-[15px] justify-center">
				<View className="h-2.5 w-16 rounded-[4px] bg-muted" />
			</View>
		);
	}
	return (
		<Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
			{item.subtitle}
		</Text>
	);
}

function shortcutLabel(item: Shortcut) {
	return item.badge ? `${item.title}, ${item.badge} pendentes` : item.title;
}

function ShortcutCard({
	item,
	failed,
}: {
	item: Shortcut;
	/** The numbers behind the subtitle failed to load: show nothing instead of a placeholder forever. */
	failed: boolean;
}) {
	return (
		<Link href={item.href} asChild>
			<Pressable
				onPress={hapticTap}
				accessibilityRole="button"
				accessibilityLabel={shortcutLabel(item)}
				className="h-[120px] w-[136px] justify-between rounded-2xl bg-background p-3.5 active:bg-accent"
			>
				<View className="flex-row items-start justify-between">
					<Icon as={item.icon} size={22} className="text-foreground/50" />
					{item.badge ? (
						<View className="h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5">
							<Text className="font-sans-semibold text-[11px] text-destructive-foreground">
								{item.badge > 99 ? "99+" : item.badge}
							</Text>
						</View>
					) : null}
				</View>
				<View className="gap-1">
					<Text className="font-sans-semibold text-sm" numberOfLines={1}>
						{item.title}
					</Text>
					<ShortcutSubtitle item={item} failed={failed} />
				</View>
			</Pressable>
		</Link>
	);
}

/** Section title + a horizontal row of shortcut cards that bleeds to the screen edges. */
export function ShortcutCarousel({
	section,
	failed = false,
}: {
	section: ShortcutSection;
	failed?: boolean;
}) {
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
					<ShortcutCard key={item.title} item={item} failed={failed} />
				))}
			</ScrollView>
		</View>
	);
}
