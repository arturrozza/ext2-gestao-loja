import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Text } from "@/components/ui/text";

/**
 * A group of form controls straight on the page, never inside a card: an optional small title (and description) on top
 * and an optional animated error under it.
 */
export function FormSection({
	title,
	description,
	error,
	children,
}: {
	title?: string;
	description?: string;
	error?: string;
	children: ReactNode;
}) {
	return (
		<View className="gap-2">
			{title ? (
				<View className="gap-0.5 px-1">
					<Text className="font-sans-semibold text-base">{title}</Text>
					{description ? (
						<Text className="text-muted-foreground text-xs">{description}</Text>
					) : null}
				</View>
			) : null}
			<View className="gap-4">{children}</View>
			{error ? (
				<Animated.View
					key={error}
					entering={FadeIn.duration(180)}
					exiting={FadeOut.duration(120)}
				>
					<Text className="px-1 text-destructive text-sm">{error}</Text>
				</Animated.View>
			) : null}
		</View>
	);
}
