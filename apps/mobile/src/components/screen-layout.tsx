import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, {
	FadeIn,
	interpolate,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { DIVIDER, FADE } from "@/lib/theme";
import { cn } from "@/lib/utils";

type ScreenLayoutProps = {
	header: ReactNode;
	children: ReactNode;
	/** Fixed bottom area (form footer). */
	footer?: ReactNode;
	/** `tabs`: leaves room for the floating tab bar and fades content behind it. */
	bottom?: "tabs" | "none";
	contentClassName?: string;
};

const entering = FadeIn.duration(260);

/**
 * Screen shell: header, scroll content that fades in, a hairline under the header once scrolled, and a gradient at
 * the bottom so content melts behind the tab bar instead of being cut.
 */
export function ScreenLayout({
	header,
	children,
	footer,
	bottom = "none",
	contentClassName,
}: ScreenLayoutProps) {
	const withTabs = bottom === "tabs";
	const scrollY = useSharedValue(0);
	// Hairline under the header, shown only once content scrolls beneath it.
	const dividerStyle = useAnimatedStyle(() => ({
		opacity: interpolate(scrollY.value, [0, 24], [0, 1], "clamp"),
	}));

	return (
		<View className="flex-1 bg-background">
			{header}
			<View className="flex-1">
				<ScrollView
					keyboardShouldPersistTaps="handled"
					scrollEventThrottle={16}
					onScroll={(event) => {
						scrollY.value = event.nativeEvent.contentOffset.y;
					}}
					contentContainerClassName={withTabs ? "pb-40" : "pb-10"}
				>
					<Animated.View entering={entering}>
						<View className={cn("gap-6 px-5 pt-2", contentClassName)}>
							{children}
						</View>
					</Animated.View>
				</ScrollView>
				<Animated.View
					pointerEvents="none"
					style={[styles.edge, styles.divider, dividerStyle]}
				/>
				<LinearGradient
					pointerEvents="none"
					colors={[FADE.clear, FADE.half, FADE.solid]}
					locations={withTabs ? [0, 0.35, 0.6] : [0, 0.5, 1]}
					style={[styles.edge, withTabs ? styles.bottomTabs : styles.bottom]}
				/>
			</View>
			{footer}
		</View>
	);
}

const styles = StyleSheet.create({
	edge: { position: "absolute", left: 0, right: 0 },
	divider: {
		top: 0,
		height: StyleSheet.hairlineWidth,
		backgroundColor: DIVIDER,
	},
	bottom: { bottom: 0, height: 32 },
	bottomTabs: { bottom: 0, height: 140 },
});
