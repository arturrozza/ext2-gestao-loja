import { CheckCircleIcon } from "phosphor-react-native/src/icons/CheckCircle";
import { useEffect, useState, useSyncExternalStore } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticSuccess } from "@/lib/haptics";

const VISIBLE_MS = 2200;
const IN = { duration: 280, easing: Easing.out(Easing.cubic) };
const OUT = { duration: 220, easing: Easing.in(Easing.cubic) };
const HIDDEN_Y = -120;

type Toast = { id: number; message: string };

let current: Toast | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

/** Confirms that something worked ("Venda registrada"). Shows over any screen, so it survives the navigation after it. */
export function showToast(message: string) {
	current = { id: nextId++, message };
	hapticSuccess();
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/** Mounted once at the root: slides the toast down from the top, then back up. */
export function ToastHost() {
	const toast = useSyncExternalStore(subscribe, () => current);
	const insets = useSafeAreaInsets();
	const y = useSharedValue(HIDDEN_Y);
	const [shown, setShown] = useState<Toast | null>(null);

	useEffect(() => {
		if (!toast) return;
		setShown(toast);
		y.value = withSequence(
			withTiming(0, IN),
			withDelay(VISIBLE_MS, withTiming(HIDDEN_Y, OUT)),
		);
	}, [toast, y]);

	const style = useAnimatedStyle(() => ({
		transform: [{ translateY: y.value }],
	}));

	if (!shown) return null;
	return (
		<Animated.View
			pointerEvents="none"
			style={[styles.host, { top: insets.top + 8 }, style]}
		>
			<View
				className="flex-row items-center gap-2.5 rounded-full border border-border bg-background py-3 pr-5 pl-4"
				accessibilityLiveRegion="polite"
				accessibilityRole="alert"
			>
				<Icon
					as={CheckCircleIcon}
					weight="fill"
					size={20}
					className="text-primary"
				/>
				<Text className="font-sans-medium text-sm">{shown.message}</Text>
			</View>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	host: { position: "absolute", left: 0, right: 0, alignItems: "center" },
});
