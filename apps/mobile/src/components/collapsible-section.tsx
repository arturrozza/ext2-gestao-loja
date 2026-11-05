import { CaretDownIcon } from "phosphor-react-native/src/icons/CaretDown";
import { CaretRightIcon } from "phosphor-react-native/src/icons/CaretRight";
import { type ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticTap, withHaptic } from "@/lib/haptics";

/**
 * One line (title and current value) straight on the page, split from the next by a hairline, that opens on tap: the
 * exceptions of a form stay out of the way. No card around it. `forceOpen` keeps it open while something inside needs
 * attention, such as a validation error. Stack them in a `border-border border-t` group so the first one gets a line on
 * top too.
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
		<View className="border-border border-b">
			<Pressable
				onPress={withHaptic(hapticTap, () => setToggled(!toggled))}
				accessibilityRole="button"
				accessibilityState={{ expanded: open }}
				className="-mx-5 flex-row items-center gap-3 px-6 py-4 active:bg-accent"
			>
				<Text className="font-sans-semibold text-[15px]">{title}</Text>
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
			{open ? <View className="gap-4 pb-5">{children}</View> : null}
		</View>
	);
}
