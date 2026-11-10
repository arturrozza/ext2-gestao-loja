import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// Android uses `performAndroidHapticsAsync`, as Expo recommends. Errors are swallowed: a missing vibration must never
// break a tap.

const ignore = () => {};

/** Runs `haptic` and then `action`: for `onPress` handlers inside scroll content. */
export function withHaptic<Args extends unknown[]>(
	haptic: () => void,
	action?: (...args: Args) => void,
) {
	return (...args: Args) => {
		haptic();
		action?.(...args);
	};
}

/** Light tap: opening a card, a row, a link. */
export function hapticTap() {
	if (Platform.OS === "android") {
		Haptics.performAndroidHapticsAsync(
			Haptics.AndroidHaptics.Virtual_Key,
		).catch(ignore);
		return;
	}
	Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(ignore);
}

/** Selection change: switching tabs, toggles (show/hide values), chips. */
export function hapticSelect() {
	if (Platform.OS === "android") {
		Haptics.performAndroidHapticsAsync(
			Haptics.AndroidHaptics.Segment_Tick,
		).catch(ignore);
		return;
	}
	Haptics.selectionAsync().catch(ignore);
}

/** Something worked: a sale registered, a form saved. */
export function hapticSuccess() {
	if (Platform.OS === "android") {
		Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm).catch(
			ignore,
		);
		return;
	}
	Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
		ignore,
	);
}

/** Main action: the "+" button, primary buttons. */
export function hapticPress() {
	if (Platform.OS === "android") {
		Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm).catch(
			ignore,
		);
		return;
	}
	Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(ignore);
}
