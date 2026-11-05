import { CaretDownIcon } from "phosphor-react-native/src/icons/CaretDown";
import { CaretRightIcon } from "phosphor-react-native/src/icons/CaretRight";
import { type ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticTap, withHaptic } from "@/lib/haptics";

/**
 * White card that shows one line (title and current value) and opens on tap: the exceptions of a form stay out of the
 * way. `forceOpen` keeps it open while something inside needs attention, such as a validation error.
 */
export function CollapsibleSection({
	title,
	summary,
	forceOpen = false,
	children,
}: {
	title: string;
	summary: string;
	forceOpen?: boolean;
	children: ReactNode;
}) {
	const [toggled, setToggled] = useState(false);
	const open = toggled || forceOpen;

	return (
		<View className="overflow-hidden rounded-2xl bg-background">
			<Pressable
				onPress={withHaptic(hapticTap, () => setToggled(!toggled))}
				accessibilityRole="button"
				accessibilityState={{ expanded: open }}
				className="flex-row items-center gap-3 px-4 py-3.5 active:bg-accent"
			>
				<Text className="font-sans-semibold text-sm">{title}</Text>
				<Text
					className="flex-1 text-right text-muted-foreground text-sm"
					numberOfLines={1}
				>
					{summary}
				</Text>
				<Icon
					as={open ? CaretDownIcon : CaretRightIcon}
					size={16}
					className="text-foreground/45"
				/>
			</Pressable>
			{open ? <View className="gap-4 px-4 pb-4">{children}</View> : null}
		</View>
	);
}
