import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Text } from "@/components/ui/text";

/** Titled group of form controls, with an optional animated error under it. */
export function FormSection({
	title,
	error,
	children,
}: {
	title: string;
	error?: string;
	children: ReactNode;
}) {
	return (
		<View className="gap-2">
			<Text className="px-1 font-sans-medium text-sm">{title}</Text>
			{children}
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
