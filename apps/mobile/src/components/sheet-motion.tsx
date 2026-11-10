import { useEffect, useRef, useState } from "react";
import {
	type LayoutChangeEvent,
	Pressable,
	StyleSheet,
	useWindowDimensions,
} from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { BACKDROP } from "@/lib/theme";

/** Rises fast and brakes slowly at the end, like the iPhone's own sheets. No bounce. */
const OPEN = { duration: 450, easing: Easing.bezier(0.32, 0.72, 0, 1) };
/** Leaves faster than it came, speeding up on the way down. */
const CLOSE = { duration: 280, easing: Easing.in(Easing.cubic) };

export type SheetMotion = ReturnType<typeof useSheetMotion>;

/**
 * The one opening and closing of everything that comes up from the bottom (drawers, sheets, full-screen modals): the
 * panel slides up from below the screen and back down, and only the backdrop fades. `mounted` stays true until the
 * closing slide ends, so a `Modal` can wait for it; `onClosed` runs at that moment. `open` goes false as soon as it starts
 * closing: what's sliding away shouldn't take touches.
 */
export function useSheetMotion(open: boolean, onClosed?: () => void) {
	const window = useWindowDimensions();
	const [mounted, setMounted] = useState(open);
	const progress = useSharedValue(0);
	// Off-screen until the panel is measured.
	const height = useSharedValue(window.height);
	const dragY = useSharedValue(0);
	const shown = useRef(false);
	const closed = useRef(onClosed);
	closed.current = onClosed;
	// Nothing runs after unmount: a slide cut short is cancelled, and one that had just ended finds `alive` off.
	const alive = useRef(true);
	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
			cancelAnimation(progress);
		};
	}, [progress]);

	useEffect(() => {
		const finish = () => {
			// Reopened before the closing slide reported back: it's open again, leave it mounted.
			if (!alive.current || shown.current) return;
			setMounted(false);
			closed.current?.();
		};
		if (open) {
			shown.current = true;
			dragY.value = 0;
			setMounted(true);
			progress.value = withTiming(1, OPEN);
			return;
		}
		if (!shown.current) return;
		shown.current = false;
		progress.value = withTiming(0, CLOSE, (finished) => {
			if (finished) scheduleOnRN(finish);
		});
	}, [open, progress, dragY]);

	const sheetStyle = useAnimatedStyle(() => ({
		transform: [
			{ translateY: (1 - progress.value) * height.value + dragY.value },
		],
	}));
	const backdropStyle = useAnimatedStyle(() => ({
		opacity: progress.value * (1 - dragY.value / height.value),
	}));
	/** Goes on the panel: its height is how far it travels. */
	const onLayout = (event: LayoutChangeEvent) => {
		height.value = event.nativeEvent.layout.height;
	};

	return { open, mounted, height, dragY, sheetStyle, backdropStyle, onLayout };
}

/** The dim layer behind a sheet: fades with the sheet's slide (never the sheet itself) and closes it on tap. */
export function SheetBackdrop({
	motion,
	onPress,
}: {
	motion: SheetMotion;
	onPress: () => void;
}) {
	return (
		<Animated.View
			style={[StyleSheet.absoluteFill, styles.backdrop, motion.backdropStyle]}
		>
			<Pressable
				accessibilityLabel="Fechar"
				onPress={onPress}
				className="flex-1"
			/>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	backdrop: { backgroundColor: BACKDROP },
});
