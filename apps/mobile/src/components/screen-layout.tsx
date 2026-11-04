import { BlurTargetView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { type ComponentRef, type ReactNode, useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, {
	interpolate,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CompactHeader } from "@/components/compact-header";
import { DIVIDER, FADE, FADE_MUTED } from "@/lib/theme";
import { cn } from "@/lib/utils";

type ScreenLayoutProps = {
	/** Fixed header. Leave it out when the title lives in the content and `compactTitle` is set. */
	header?: ReactNode;
	children: ReactNode;
	/** Fixed bottom area (form footer). */
	footer?: ReactNode;
	/** `tabs`: leaves room for the floating tab bar and fades content behind it. */
	bottom?: "tabs" | "none";
	contentClassName?: string;
	/** `muted`: light-gray page so white cards stand out (home). */
	tone?: "default" | "muted";
	/**
	 * Title of the frosted-glass compact bar that appears at the top once the content scrolls (iOS large-title style),
	 * so the user always knows where they are. Content then starts under the status bar.
	 */
	compactTitle?: string;
};

/**
 * Screen shell: header (or a compact glass bar that appears on scroll), scroll content, a hairline under a fixed
 * header once scrolled, and a gradient at the bottom so content melts behind the tab bar instead of being cut.
 * Content shows up right away: the stack's slide is the only screen transition. No scroll indicator.
 */
export function ScreenLayout({
	header,
	children,
	footer,
	bottom = "none",
	contentClassName,
	tone = "default",
	compactTitle,
}: ScreenLayoutProps) {
	const insets = useSafeAreaInsets();
	const blurTarget = useRef<ComponentRef<typeof View>>(null);
	const withTabs = bottom === "tabs";
	const fade = tone === "muted" ? FADE_MUTED : FADE;
	const scrollY = useSharedValue(0);
	// Hairline under a fixed header, shown only once content scrolls beneath it.
	const dividerStyle = useAnimatedStyle(() => ({
		opacity: interpolate(scrollY.value, [0, 24], [0, 1], "clamp"),
	}));

	return (
		<View
			className={cn("flex-1", tone === "muted" ? "bg-card" : "bg-background")}
		>
			{header}
			<View className="flex-1">
				<BlurTargetView ref={blurTarget} style={styles.fill}>
					<ScrollView
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
						scrollEventThrottle={16}
						onScroll={(event) => {
							scrollY.value = event.nativeEvent.contentOffset.y;
						}}
						contentContainerClassName={withTabs ? "pb-40" : "pb-10"}
						contentContainerStyle={
							compactTitle ? { paddingTop: insets.top } : undefined
						}
					>
						<View className={cn("gap-6 px-5 pt-2", contentClassName)}>
							{children}
						</View>
					</ScrollView>
				</BlurTargetView>
				{compactTitle ? (
					<CompactHeader
						title={compactTitle}
						scrollY={scrollY}
						blurTarget={blurTarget}
					/>
				) : (
					<Animated.View
						pointerEvents="none"
						style={[styles.edge, styles.divider, dividerStyle]}
					/>
				)}
				<LinearGradient
					pointerEvents="none"
					colors={[fade.clear, fade.half, fade.solid]}
					locations={withTabs ? [0, 0.35, 0.6] : [0, 0.5, 1]}
					style={[styles.edge, withTabs ? styles.bottomTabs : styles.bottom]}
				/>
			</View>
			{footer}
		</View>
	);
}

const styles = StyleSheet.create({
	fill: { flex: 1 },
	edge: { position: "absolute", left: 0, right: 0 },
	divider: {
		top: 0,
		height: StyleSheet.hairlineWidth,
		backgroundColor: DIVIDER,
	},
	bottom: { bottom: 0, height: 32 },
	bottomTabs: { bottom: 0, height: 140 },
});
