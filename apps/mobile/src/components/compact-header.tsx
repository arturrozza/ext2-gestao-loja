import { BlurView } from "expo-blur";
import { type ComponentRef, type RefObject, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
	interpolate,
	type SharedValue,
	useAnimatedProps,
	useAnimatedReaction,
	useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { Text } from "@/components/ui/text";
import { GLASS, HEADER_BORDER } from "@/lib/theme";

/** Height of the bar below the status bar. */
export const COMPACT_HEIGHT = 44;
/** Scroll range (px) over which the bar appears. */
const RANGE = [24, 56];
const MAX_BLUR = 80;

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

/**
 * iOS large-title style bar: invisible at the top of the page, it turns into frosted glass (blur + light tint) with a
 * centered title and a hairline at the bottom as the content scrolls under it. Covers the status bar too.
 *
 * The blur fades in through its `intensity`, never through `opacity` on the blur or its parents (Expo docs). On
 * Android the blur needs `blurTarget`: the `BlurTargetView` that wraps the scroll content. It only exists once the
 * page has scrolled: on Android its tint paints a white veil even at intensity 0, which hides white buttons under it.
 */
export function CompactHeader({
	title,
	scrollY,
	blurTarget,
}: {
	title: string;
	scrollY: SharedValue<number>;
	blurTarget: RefObject<ComponentRef<typeof View> | null>;
}) {
	const insets = useSafeAreaInsets();
	const [scrolled, setScrolled] = useState(false);
	useAnimatedReaction(
		() => scrollY.value > RANGE[0],
		(now, before) => {
			if (now !== before) scheduleOnRN(setScrolled, now);
		},
	);

	const blurProps = useAnimatedProps(() => ({
		intensity: interpolate(scrollY.value, RANGE, [0, MAX_BLUR], "clamp"),
	}));
	const shown = useAnimatedStyle(() => ({
		opacity: interpolate(scrollY.value, RANGE, [0, 1], "clamp"),
	}));
	const titleStyle = useAnimatedStyle(() => ({
		opacity: interpolate(scrollY.value, RANGE, [0, 1], "clamp"),
		transform: [
			{ translateY: interpolate(scrollY.value, RANGE, [6, 0], "clamp") },
		],
	}));

	return (
		<View
			pointerEvents="none"
			style={[styles.bar, { height: insets.top + COMPACT_HEIGHT }]}
		>
			{scrolled ? (
				<AnimatedBlurView
					animatedProps={blurProps}
					tint={
						Platform.OS === "ios" ? "systemChromeMaterialLight" : "extraLight"
					}
					blurMethod="dimezisBlurViewSdk31Plus"
					blurTarget={blurTarget}
					style={StyleSheet.absoluteFill}
				/>
			) : null}
			{/* Light milky layer over the blur, so it reads as glass and not just blur. */}
			<Animated.View style={[StyleSheet.absoluteFill, styles.tint, shown]} />
			<View style={[styles.titleSlot, { top: insets.top }]}>
				<Animated.View style={titleStyle}>
					<Text className="font-sans-semibold text-base">{title}</Text>
				</Animated.View>
			</View>
			<Animated.View style={[styles.hairline, shown]} />
		</View>
	);
}

const styles = StyleSheet.create({
	bar: { position: "absolute", top: 0, left: 0, right: 0, overflow: "hidden" },
	tint: { backgroundColor: GLASS },
	titleSlot: {
		position: "absolute",
		left: 0,
		right: 0,
		height: COMPACT_HEIGHT,
		alignItems: "center",
		justifyContent: "center",
	},
	hairline: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		height: 0.5,
		backgroundColor: HEADER_BORDER,
	},
});
