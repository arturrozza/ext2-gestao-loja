import { vars } from "nativewind";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SheetDragContext, useDragToClose } from "@/components/sheet-drag";
import { SheetBackdrop, type SheetMotion } from "@/components/sheet-motion";
import { SHEET_SHADOW } from "@/lib/theme";

/**
 * Inside a sheet the two surfaces swap: the sheet is white and the cards in it gray, with white fields. Swapping the
 * color variables flips every `bg-background` / `bg-card` below without touching the components.
 */
const SHEET_SURFACES = vars({
	"--background": "0 0% 97.5%",
	"--card": "0 0% 100%",
});
/** Gap between the top of the screen and the sheet, where the previous screen shows. */
export function sheetTop(insetTop: number) {
	return insetTop + 10;
}

/**
 * The sheet's card, imitating the iPhone's modal: a gap at the top where the previous screen shows (dimmed), rounded top
 * corners, white with gray cards, and dragged down from its header (`SheetHeader`) to close. `motion` slides it in and
 * out (`useSheetMotion`); whoever owns it decides what closing means (a route goes back, a modal hides).
 */
export function SheetFrame({
	motion,
	onClose,
	children,
}: {
	motion: SheetMotion;
	onClose: () => void;
	children: ReactNode;
}) {
	const insets = useSafeAreaInsets();
	const drag = useDragToClose(motion, onClose);
	return (
		<View
			className="flex-1"
			style={{ paddingTop: sheetTop(insets.top) }}
			// On its way out it's no longer there to be tapped: no second save, no second close.
			pointerEvents={motion.open ? "auto" : "none"}
		>
			<SheetBackdrop motion={motion} onPress={onClose} />
			<Animated.View
				style={[styles.fill, styles.lift, motion.sheetStyle]}
				onLayout={motion.onLayout}
			>
				<View
					className="flex-1 overflow-hidden rounded-t-[24px]"
					style={SHEET_SURFACES}
				>
					<SheetDragContext.Provider value={drag}>
						{children}
					</SheetDragContext.Provider>
				</View>
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	fill: { flex: 1 },
	lift: {
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		boxShadow: SHEET_SHADOW,
	},
});
