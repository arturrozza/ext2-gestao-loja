import { vars } from "nativewind";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, StyleSheet, View } from "react-native";
import {
	GestureDetector,
	GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDragToClose } from "@/components/sheet-drag";
import { SheetBackdrop, useSheetMotion } from "@/components/sheet-motion";
import { Text } from "@/components/ui/text";
import { SHEET_SHADOW } from "@/lib/theme";

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
	const motion = useSheetMotion(open);
	const drag = useDragToClose(motion, onClose);
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
			visible={motion.mounted}
			transparent
			animationType="none"
			statusBarTranslucent
			navigationBarTranslucent
			onRequestClose={onClose}
		>
			{/* Color variables reach into the modal: a sheet screen swaps the surfaces, so put them back. */}
			<GestureHandlerRootView style={styles.root}>
				<View
					className="flex-1"
					style={PAGE_SURFACES}
					pointerEvents={motion.open ? "auto" : "none"}
				>
					<KeyboardAvoidingView
						behavior="padding"
						className="flex-1 justify-end"
					>
						<SheetBackdrop motion={motion} onPress={onClose} />
						<Animated.View
							style={[styles.lift, motion.sheetStyle]}
							onLayout={motion.onLayout}
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
	lift: {
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		boxShadow: SHEET_SHADOW,
	},
});
