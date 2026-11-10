import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { XIcon } from "phosphor-react-native/src/icons/X";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import {
	GestureDetector,
	usePanGesture,
	usePinchGesture,
	useSimultaneousGestures,
	useTapGesture,
} from "react-native-gesture-handler";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FullScreenModal } from "@/components/full-screen-modal";
import { IconButton } from "@/components/icon-button";
import { PHOTO_BACKDROP } from "@/lib/theme";

const MAX_ZOOM = 4;
const SETTLE = { duration: 180, easing: Easing.out(Easing.cubic) };

function clamp(value: number, min: number, max: number) {
	"worklet";
	return Math.min(Math.max(value, min), max);
}

/**
 * Pinch to zoom the square photo (up to 4x), drag it while zoomed, double tap to go back. It never shrinks below the
 * screen's width nor slides past its own edges. Lives only while the viewer is open, so every opening starts at 1x.
 */
function useZoom(side: number) {
	const scale = useSharedValue(1);
	const startScale = useSharedValue(1);
	const x = useSharedValue(0);
	const y = useSharedValue(0);

	/** Moves the photo by (dx, dy), as far as its edges allow at the current zoom. */
	const moveBy = (dx: number, dy: number) => {
		"worklet";
		const limit = ((scale.value - 1) * side) / 2;
		x.value = clamp(x.value + dx, -limit, limit);
		y.value = clamp(y.value + dy, -limit, limit);
	};

	const pinch = usePinchGesture({
		onActivate: () => {
			"worklet";
			startScale.value = scale.value;
		},
		onUpdate: (event) => {
			"worklet";
			scale.value = clamp(startScale.value * event.scale, 1, MAX_ZOOM);
			// Zooming out pulls the photo back inside its edges.
			moveBy(0, 0);
		},
	});
	// By the change of each frame, not the total: a pinch in the same gesture may have moved the photo meanwhile.
	const pan = usePanGesture({
		onUpdate: (event) => {
			"worklet";
			moveBy(event.changeX, event.changeY);
		},
	});
	const doubleTap = useTapGesture({
		numberOfTaps: 2,
		onActivate: () => {
			"worklet";
			scale.value = withTiming(1, SETTLE);
			x.value = withTiming(0, SETTLE);
			y.value = withTiming(0, SETTLE);
		},
	});

	const style = useAnimatedStyle(() => ({
		transform: [
			{ translateX: x.value },
			{ translateY: y.value },
			{ scale: scale.value },
		],
	}));
	return { gesture: useSimultaneousGestures(pinch, pan, doubleTap), style };
}

function ZoomablePhoto({ uri, label }: { uri: string; label: string }) {
	const { width } = useWindowDimensions();
	const zoom = useZoom(width);
	return (
		<GestureDetector gesture={zoom.gesture}>
			<View className="flex-1 items-center justify-center">
				<Animated.View style={[{ width, height: width }, zoom.style]}>
					<Image
						source={{ uri }}
						style={styles.photo}
						contentFit="contain"
						accessibilityLabel={label}
						accessibilityIgnoresInvertColors
					/>
				</Animated.View>
			</View>
		</GestureDetector>
	);
}

/** The product photo over the whole screen, to look at the details (produtos.md). Closes on the X or "back". */
export function PhotoViewer({
	uri,
	label,
	open,
	onClose,
}: {
	uri: string;
	label: string;
	open: boolean;
	onClose: () => void;
}) {
	const insets = useSafeAreaInsets();
	return (
		<FullScreenModal open={open} onClose={onClose}>
			<View style={styles.root}>
				{/* The app's status bar is dark (root layout): on the black backdrop it has to be light. */}
				<StatusBar style="light" />
				<ZoomablePhoto uri={uri} label={label} />
				<View className="absolute right-5" style={{ top: insets.top + 8 }}>
					<IconButton icon={XIcon} label="Fechar foto" onPress={onClose} />
				</View>
			</View>
		</FullScreenModal>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: PHOTO_BACKDROP },
	photo: { width: "100%", height: "100%" },
});
