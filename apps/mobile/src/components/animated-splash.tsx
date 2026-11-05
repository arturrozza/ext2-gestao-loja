import { Image } from "expo-image";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { Modal, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

// Same as the native splash in app.json (`expo-splash-screen`), so the swap to this view is invisible.
const SPLASH_ORANGE = "#EA580C";
const ICON_SIZE = 200;
const ICON = require("../../assets/images/splash-icon.png");

const SWING = { easing: Easing.inOut(Easing.quad) };
const LEAVE = { duration: 380, easing: Easing.in(Easing.cubic) };
/** Longer than the whole animation: if the Modal never shows, the app still opens. */
const FALLBACK_MS = 2500;

function hideNativeSplash() {
	SplashScreen.hideAsync().catch(() => undefined);
}

/**
 * Takes over from the native splash once the app is ready: the bag swings on its handle like it was just picked up,
 * shrinks a little, then the orange screen slides up and uncovers the app. No fades (docs/conventions.md).
 */
export function AnimatedSplash() {
	const { height } = useWindowDimensions();
	const [done, setDone] = useState(false);
	const started = useRef(false);
	const rotation = useSharedValue(0);
	const scale = useSharedValue(1);
	const offset = useSharedValue(0);

	useEffect(() => {
		const timer = setTimeout(() => {
			hideNativeSplash();
			setDone(true);
		}, FALLBACK_MS);
		return () => clearTimeout(timer);
	}, []);

	const curtain = useAnimatedStyle(() => ({
		transform: [{ translateY: offset.value }],
	}));
	const bag = useAnimatedStyle(() => ({
		transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
	}));

	function start() {
		// `onLayout` can fire again (e.g. rotation); the animation runs once.
		if (started.current) return;
		started.current = true;
		// The view is drawn exactly like the native splash, so hiding it now shows no change.
		hideNativeSplash();
		rotation.value = withSequence(
			withTiming(-10, { ...SWING, duration: 180 }),
			withTiming(7, { ...SWING, duration: 200 }),
			withTiming(-3, { ...SWING, duration: 160 }),
			withTiming(0, { ...SWING, duration: 140 }),
		);
		scale.value = withDelay(680, withTiming(0.88, { duration: 140 }));
		offset.value = withDelay(
			800,
			// Done even if interrupted: a Modal left behind would block every touch.
			withTiming(-height, LEAVE, () => scheduleOnRN(setDone, true)),
		);
	}

	if (done) return null;

	// A Modal, not a plain overlay: the native stack draws its screens above any sibling view, which left only a strip
	// of the splash showing. `animationType="none"`: the curtain does its own exit.
	return (
		<Modal
			visible
			transparent
			animationType="none"
			statusBarTranslucent
			navigationBarTranslucent
			onRequestClose={() => setDone(true)}
		>
			<Animated.View onLayout={start} style={[styles.curtain, curtain]}>
				<Animated.View style={[styles.bag, bag]}>
					<Image source={ICON} style={styles.icon} />
				</Animated.View>
			</Animated.View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	curtain: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: SPLASH_ORANGE,
	},
	// Swings from the handle, not the middle of the bag.
	bag: { transformOrigin: "50% 25%" },
	icon: { width: ICON_SIZE, height: ICON_SIZE },
});
