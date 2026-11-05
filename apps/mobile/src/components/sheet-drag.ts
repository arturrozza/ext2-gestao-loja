import { createContext, useContext, useEffect, useRef } from "react";
import { type PanGesture, usePanGesture } from "react-native-gesture-handler";
import { Easing, type SharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { hapticTap } from "@/lib/haptics";

/** Drag-down gesture of the sheet the screen is in; `SheetHeader` attaches it. `null` outside a sheet. */
export const SheetDragContext = createContext<PanGesture | null>(null);

export function useSheetDrag() {
	return useContext(SheetDragContext);
}

const SETTLE = { duration: 180, easing: Easing.out(Easing.cubic) };
/** The release keeps going from where the finger left it, at once: a slow-starting curve would read as a pause. */
const FLING = { duration: 180, easing: Easing.out(Easing.quad) };
/** A drag past this share of the sheet, or a flick faster than this (points per second), closes it. */
const CLOSE_SHARE = 0.25;
const CLOSE_VELOCITY = 800;
/** Below this it's still a tap on a row or button. */
const DRAG_START = 6;
/** Closing can be refused (a form with work asks first): if the sheet is still there after this, it slides back. */
const REFUSED_AFTER_MS = 500;

/**
 * Drag down to close, for drawers and sheets alike: the panel follows the finger (`dragY`), then closes or settles back
 * on release. Recognized natively, so it works inside a `Modal`; taps still reach the content, since the gesture only
 * activates once the finger moves down.
 */
export function useDragToClose(
	dragY: SharedValue<number>,
	height: SharedValue<number>,
	onClose: () => void,
) {
	const mounted = useRef(true);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(
		() => () => {
			mounted.current = false;
			if (timer.current) clearTimeout(timer.current);
		},
		[],
	);
	const close = () => {
		hapticTap();
		onClose();
		timer.current = setTimeout(() => {
			if (mounted.current) dragY.value = withTiming(0, SETTLE);
		}, REFUSED_AFTER_MS);
	};
	return usePanGesture({
		activeOffsetY: DRAG_START,
		failOffsetX: [-20, 20],
		onUpdate: (event) => {
			"worklet";
			dragY.value = Math.max(0, event.translationY);
		},
		onDeactivate: (event) => {
			"worklet";
			const far = event.translationY > height.value * CLOSE_SHARE;
			if (far || event.velocityY > CLOSE_VELOCITY) {
				dragY.value = withTiming(height.value, FLING);
				scheduleOnRN(close);
			} else {
				dragY.value = withTiming(0, SETTLE);
			}
		},
	});
}
