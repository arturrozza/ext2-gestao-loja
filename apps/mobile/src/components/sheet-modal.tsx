import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SheetFrame, sheetTop } from "@/components/sheet-frame";
import { SheetHeader } from "@/components/sheet-header";
import { useSheetMotion } from "@/components/sheet-motion";

/**
 * A sheet opened from a screen without navigating (pickers that hand a choice back): same look and drag as the form
 * sheets, over the current screen.
 */
export function SheetModal({
	open,
	onClose,
	title,
	headerLeft,
	children,
}: {
	open: boolean;
	onClose: () => void;
	title: string;
	headerLeft?: ReactNode;
	children: ReactNode;
}) {
	const insets = useSafeAreaInsets();
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
			<GestureHandlerRootView style={styles.root}>
				<SheetFrame motion={motion} onClose={onClose}>
					{/* The view measures itself from the sheet, below the gap on top: the offset puts that gap back. */}
					<KeyboardAvoidingView
						behavior="padding"
						keyboardVerticalOffset={sheetTop(insets.top)}
						className="flex-1 bg-card"
					>
						<SheetHeader title={title} onClose={onClose} left={headerLeft} />
						{children}
					</KeyboardAvoidingView>
				</SheetFrame>
			</GestureHandlerRootView>
		</Modal>
	);
}

const styles = StyleSheet.create({ root: { flex: 1 } });
