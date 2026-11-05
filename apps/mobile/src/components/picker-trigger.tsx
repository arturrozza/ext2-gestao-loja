import { CaretDownIcon } from "phosphor-react-native/src/icons/CaretDown";
import { XIcon } from "phosphor-react-native/src/icons/X";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { FieldError } from "@/components/field-error";
import { Icon, type IconType } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticSelect, hapticTap, withHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/** The field shell of every picker (select, date, person): looks like an input, opens something when tapped. */
export const FIELD_SHELL =
	"h-12 flex-row items-center gap-3 rounded-[8px] border border-transparent bg-card px-4 active:bg-accent";

/**
 * A field that opens a picker: optional label above, an icon and the chosen value (or the placeholder), a caret, and
 * the error below. With `onClear`, a chosen value can be removed with an "x" in place of the caret.
 */
export function PickerTrigger({
	label,
	icon,
	value,
	placeholder,
	error,
	onPress,
	onClear,
	action,
	accessibilityLabel,
}: {
	label?: string;
	icon?: IconType;
	value: string | null;
	placeholder: string;
	error?: string;
	onPress: () => void;
	onClear?: () => void;
	/** Small control on the right of the label (e.g. "+ Nova"). */
	action?: ReactNode;
	accessibilityLabel?: string;
}) {
	return (
		<View className="gap-2">
			{label ? (
				<View className="flex-row items-center justify-between px-1">
					<Text className="font-sans-medium text-sm">{label}</Text>
					{action}
				</View>
			) : null}
			<Pressable
				onPress={withHaptic(hapticTap, onPress)}
				accessibilityRole="button"
				accessibilityLabel={
					accessibilityLabel ?? `${label ?? ""} ${value ?? placeholder}`.trim()
				}
				className={cn(FIELD_SHELL, error && "border-destructive")}
			>
				{icon ? (
					<Icon
						as={icon}
						weight="regular"
						size={20}
						className="text-foreground/70"
					/>
				) : null}
				<Text
					className={cn(
						"flex-1 text-base",
						!value && "text-muted-foreground/60",
					)}
					numberOfLines={1}
				>
					{value ?? placeholder}
				</Text>
				{value && onClear ? (
					<Pressable
						onPress={withHaptic(hapticSelect, onClear)}
						accessibilityRole="button"
						accessibilityLabel="Tirar"
						hitSlop={8}
					>
						<Icon as={XIcon} size={16} className="text-foreground/45" />
					</Pressable>
				) : (
					<Icon as={CaretDownIcon} size={16} className="text-foreground/45" />
				)}
			</Pressable>
			<FieldError error={error} />
		</View>
	);
}
