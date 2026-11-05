import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";

/**
 * Fixed bottom bar of a form screen (summary + submit), white over the gray page, no shadow. `error`: a request that
 * failed (shown above the button).
 */
export function FormFooter({
	children,
	error,
}: {
	children: ReactNode;
	error?: string | null;
}) {
	const insets = useSafeAreaInsets();

	return (
		<View
			className="gap-3 border-border border-t bg-background px-5 pt-4"
			style={{ paddingBottom: insets.bottom + 12 }}
		>
			{error ? (
				<Animated.View key={error} entering={FadeIn.duration(180)}>
					<Text className="text-center text-destructive text-sm">{error}</Text>
				</Animated.View>
			) : null}
			{children}
		</View>
	);
}
