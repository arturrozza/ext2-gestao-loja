import { vars } from "nativewind";
import { type ReactNode, useEffect, useState } from "react";
import {
	KeyboardAvoidingView,
	Modal,
	Pressable,
	StyleSheet,
	View,
} from "react-native";
import {
	GestureDetector,
	GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { useDragToClose } from "@/components/sheet-drag";
import { Text } from "@/components/ui/text";
import { BACKDROP, SHEET_SHADOW } from "@/lib/theme";

const OPEN = { duration: 320, easing: Easing.out(Easing.cubic) };
const CLOSE = { duration: 220, easing: Easing.in(Easing.cubic) };

/**
 * Slides the sheet up from below the screen on open and back down on close, then unmounts the modal.
 * The backdrop dims along with it; the sheet itself never fades.
 */
function useSheetAnimation(open: boolean) {
	const [mounted, setMounted] = useState(open);
	const progress = useSharedValue(0);
	// Starts off-screen until the sheet is measured.
	const height = useSharedValue(1000);
	const dragY = useSharedValue(0);

	useEffect(() => {
		if (open) {
			dragY.value = 0;
			setMounted(true);
			progress.value = withTiming(1, OPEN);
			return;
		}
		progress.value = withTiming(0, CLOSE, (finished) => {
			if (finished) scheduleOnRN(setMounted, false);
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

	return { mounted, height, dragY, sheetStyle, backdropStyle };
}

/**
 * Bottom sheet: white panel with a grabber and a title, sliding up from the bottom. Rises above the keyboard. Closes by
 * dragging it down, from anywhere; with a list that scrolls inside, pass `dragFromTop` so only the top drags it.
 */
export function BottomSheet({
	open,
	onClose,
	title,
	dragFromTop = false,
	children,
}: {
	open: boolean;
	onClose: () => void;
	title?: string;
	dragFromTop?: boolean;
	children: ReactNode;
}) {
	const insets = useSafeAreaInsets();
	const { mounted, height, dragY, sheetStyle, backdropStyle } =
		useSheetAnimation(open);
	const drag = useDragToClose(dragY, height, onClose);
	const top = (
		<View className="gap-1 pt-3">
			<View className="mb-2 h-1 w-10 self-center rounded-full bg-border" />
			{title ? (
				<Text className="px-3 pb-2 font-sans-semibold text-base">{title}</Text>
			) : null}
		</View>
	);
	const panelClass = "gap-1 rounded-t-3xl bg-background px-3";
	const panelStyle = { paddingBottom: insets.bottom + 12 };

	return (
		<Modal
			visible={mounted}
			transparent
			animationType="none"
			statusBarTranslucent
			navigationBarTranslucent
			onRequestClose={onClose}
		>
			{/* Color variables reach into the modal: a sheet screen swaps the surfaces, so put them back. */}
			<GestureHandlerRootView style={styles.root}>
				<View className="flex-1" style={PAGE_SURFACES}>
					<KeyboardAvoidingView
						behavior="padding"
						className="flex-1 justify-end"
					>
						<Animated.View
							style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
						>
							<Pressable
								accessibilityLabel="Fechar"
								onPress={onClose}
								className="flex-1"
							/>
						</Animated.View>
						<Animated.View
							style={[styles.lift, sheetStyle]}
							onLayout={(event) => {
								height.value = event.nativeEvent.layout.height;
							}}
						>
							{dragFromTop ? (
								<View className={panelClass} style={panelStyle}>
									<GestureDetector gesture={drag}>{top}</GestureDetector>
									{children}
								</View>
							) : (
								<GestureDetector gesture={drag}>
									<View className={panelClass} style={panelStyle}>
										{top}
										{children}
									</View>
								</GestureDetector>
							)}
						</Animated.View>
					</KeyboardAvoidingView>
				</View>
			</GestureHandlerRootView>
		</Modal>
	);
}

const PAGE_SURFACES = vars({
	"--background": "0 0% 100%",
	"--card": "0 0% 97.5%",
});

const styles = StyleSheet.create({
	root: { flex: 1 },
	backdrop: { backgroundColor: BACKDROP },
	lift: {
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		boxShadow: SHEET_SHADOW,
	},
});
