import { useRouter } from "expo-router";
import { XIcon } from "phosphor-react-native/src/icons/X";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { useSheetDrag } from "@/components/sheet-drag";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticTap, withHaptic } from "@/lib/haptics";
import { leaveScreen } from "@/lib/navigation";

const SLOT = "h-12 w-12";

/** The header is where the sheet is dragged down from (the content below scrolls). */
function DragArea({ children }: { children: ReactNode }) {
	const gesture = useSheetDrag();
	if (!gesture) return children;
	return <GestureDetector gesture={gesture}>{children}</GestureDetector>;
}

/**
 * Header of a screen shown as a sheet (create and edit forms): a grabber, the centered title and a large close button.
 * Dragging it down or tapping close goes back; a form with unsaved work still asks first (`DiscardGuard`).
 */
export function SheetHeader({
	title,
	onClose,
	left,
}: {
	title: string;
	/** A small action on the left (e.g. "+" to add); the title stays centered either way. */
	left?: ReactNode;
	/** For a sheet that isn't a route (`SheetModal`); a route goes back. */
	onClose?: () => void;
}) {
	const router = useRouter();
	const close = onClose ?? (() => leaveScreen(router));
	return (
		<DragArea>
			<View className="gap-2 px-5 pt-2.5 pb-3">
				<View className="h-1 w-10 self-center rounded-full bg-border" />
				<View className="flex-row items-center gap-3">
					{left ?? <View className={SLOT} />}
					<Text
						className="flex-1 text-center font-sans-semibold text-lg"
						numberOfLines={1}
					>
						{title}
					</Text>
					<Pressable
						onPress={withHaptic(hapticTap, close)}
						accessibilityRole="button"
						accessibilityLabel="Fechar"
						hitSlop={8}
						className={`${SLOT} items-center justify-center rounded-full bg-background active:bg-accent`}
					>
						<Icon as={XIcon} size={22} />
					</Pressable>
				</View>
			</View>
		</DragArea>
	);
}
