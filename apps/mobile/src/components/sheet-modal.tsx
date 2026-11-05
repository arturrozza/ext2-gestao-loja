import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SheetFrame } from "@/components/sheet-frame";
import { SheetHeader } from "@/components/sheet-header";

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
	return (
		<Modal
			visible={open}
			transparent
			animationType="slide"
			statusBarTranslucent
			navigationBarTranslucent
			onRequestClose={onClose}
		>
			{/* A modal is its own window: gestures need their own root there. */}
			<GestureHandlerRootView style={styles.root}>
				<SheetFrame onClose={onClose}>
					<KeyboardAvoidingView behavior="padding" className="flex-1 bg-card">
						<SheetHeader title={title} onClose={onClose} left={headerLeft} />
						{children}
					</KeyboardAvoidingView>
				</SheetFrame>
			</GestureHandlerRootView>
		</Modal>
	);
}

const styles = StyleSheet.create({ root: { flex: 1 } });
