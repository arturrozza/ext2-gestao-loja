import { useRouter } from "expo-router";
import { vars } from "nativewind";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SheetDragContext, useDragToClose } from "@/components/sheet-drag";
import { leaveScreen } from "@/lib/navigation";
import { SHEET_SHADOW } from "@/lib/theme";

/**
 * Inside a sheet the two surfaces swap: the sheet is white and the cards in it gray, with white fields. Swapping the
 * color variables flips every `bg-background` / `bg-card` below without touching the components.
 */
const SHEET_SURFACES = vars({
	"--background": "0 0% 97.5%",
	"--card": "0 0% 100%",
});
/** Position of the dragged sheet and its gesture. */
function useSheetDrag(onClose: () => void) {
	const y = useSharedValue(0);
	const height = useSharedValue(800);
	const gesture = useDragToClose(y, height, onClose);
	const style = useAnimatedStyle(() => ({
		transform: [{ translateY: y.value }],
	}));
	return { gesture, style, height };
}

/**
 * The sheet's card, imitating the iPhone's modal: a gap at the top where the previous screen shows, rounded top corners,
 * white with gray cards, and dragged down from its header (`SheetHeader`) to close. `onClose` defaults to going back.
 */
export function SheetFrame({
	onClose,
	children,
}: {
	onClose?: () => void;
	children: ReactNode;
}) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const drag = useSheetDrag(onClose ?? (() => leaveScreen(router)));
	return (
		<View className="flex-1" style={{ paddingTop: insets.top + 10 }}>
			<Animated.View
				style={[styles.fill, styles.lift, drag.style]}
				onLayout={(event) => {
					drag.height.value = event.nativeEvent.layout.height;
				}}
			>
				<View
					className="flex-1 overflow-hidden rounded-t-[24px]"
					style={SHEET_SURFACES}
				>
					<SheetDragContext.Provider value={drag.gesture}>
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
