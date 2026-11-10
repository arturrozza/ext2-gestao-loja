import type { ReactNode } from "react";
import { Modal, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { useSheetMotion } from "@/components/sheet-motion";

/**
 * A modal that covers the whole screen (photo, camera): comes up from the bottom and goes back down with the same slide
 * as the sheets. It has no backdrop, since nothing shows behind it. Its content only mounts while it's open.
 */
export function FullScreenModal({
	open,
	onClose,
	children,
}: {
	open: boolean;
	onClose: () => void;
	children: ReactNode;
}) {
	const motion = useSheetMotion(open);
	return (
		<Modal
			visible={motion.mounted}
			transparent
			animationType="none"
			statusBarTranslucent
			navigationBarTranslucent
			onRequestClose={onClose}
		>
			{/* A modal is its own window: gestures need their own root there. */}
			<GestureHandlerRootView style={styles.fill}>
				<Animated.View
					style={[styles.fill, motion.sheetStyle]}
					onLayout={motion.onLayout}
					pointerEvents={motion.open ? "auto" : "none"}
				>
					{children}
				</Animated.View>
			</GestureHandlerRootView>
		</Modal>
	);
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
