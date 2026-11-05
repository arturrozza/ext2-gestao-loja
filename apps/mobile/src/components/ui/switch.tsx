import { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
	Easing,
	interpolateColor,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { hapticSelect } from "@/lib/haptics";
import { THEME } from "@/lib/theme";

const WIDTH = 50;
const HEIGHT = 30;
/** Gap between the track and the thumb: both are pills, so their curves stay parallel. */
const INSET = 3;
const THUMB = HEIGHT - INSET * 2;
const TRAVEL = WIDTH - THUMB - INSET * 2;
const OFF_TRACK = "hsl(0 0% 86%)";
const MOVE = { duration: 220, easing: Easing.out(Easing.cubic) };

/** On/off toggle drawn by the app, so it looks the same on iOS and Android. The thumb slides; the track turns orange. */
export function Switch({
	value,
	onValueChange,
	disabled = false,
	accessibilityLabel,
}: {
	value: boolean;
	onValueChange: (value: boolean) => void;
	disabled?: boolean;
	accessibilityLabel?: string;
}) {
	const progress = useSharedValue(value ? 1 : 0);

	useEffect(() => {
		progress.value = withTiming(value ? 1 : 0, MOVE);
	}, [value, progress]);

	const trackStyle = useAnimatedStyle(() => ({
		backgroundColor: interpolateColor(
			progress.value,
			[0, 1],
			[OFF_TRACK, THEME.primary],
		),
	}));
	const thumbStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: progress.value * TRAVEL }],
	}));

	return (
		<Pressable
			onPress={() => {
				hapticSelect();
				onValueChange(!value);
			}}
			disabled={disabled}
			hitSlop={8}
			accessibilityRole="switch"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ checked: value, disabled }}
			style={disabled ? styles.disabled : undefined}
		>
			<Animated.View style={[styles.track, trackStyle]}>
				<Animated.View style={[styles.thumb, thumbStyle]} />
			</Animated.View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	track: {
		width: WIDTH,
		height: HEIGHT,
		borderRadius: HEIGHT / 2,
		padding: INSET,
	},
	thumb: {
		width: THUMB,
		height: THUMB,
		borderRadius: THUMB / 2,
		backgroundColor: THEME.background,
	},
	disabled: { opacity: 0.5 },
});
