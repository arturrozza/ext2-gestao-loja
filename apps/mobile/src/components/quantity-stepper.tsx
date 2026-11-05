import { MinusIcon } from "phosphor-react-native/src/icons/Minus";
import { PlusIcon } from "phosphor-react-native/src/icons/Plus";
import { Pressable, View } from "react-native";
import { DoneTextInput } from "@/components/done-text-input";
import { Icon } from "@/components/ui/icon";
import { hapticSelect, withHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const MAX_DIGITS = 6;

function StepButton({
	icon,
	label,
	disabled = false,
	onPress,
}: {
	icon: typeof PlusIcon;
	label: string;
	disabled?: boolean;
	onPress: () => void;
}) {
	return (
		<Pressable
			onPress={withHaptic(hapticSelect, onPress)}
			disabled={disabled}
			accessibilityRole="button"
			accessibilityLabel={label}
			hitSlop={4}
			className={cn(
				"h-10 w-10 items-center justify-center rounded-full bg-field-raised active:bg-accent",
				disabled && "opacity-40",
			)}
		>
			<Icon as={icon} size={16} />
		</Pressable>
	);
}

/** Whole quantity with − / + and a typed value in the middle (quantities are always whole, produtos.md). */
export function QuantityStepper({
	value,
	onChange,
	min = 1,
	invalid = false,
}: {
	value: number;
	onChange: (value: number) => void;
	min?: number;
	invalid?: boolean;
}) {
	return (
		<View
			className={cn(
				"flex-row items-center gap-1 self-start rounded-full border border-transparent bg-field p-1",
				invalid && "border-destructive",
			)}
		>
			<StepButton
				icon={MinusIcon}
				label="Diminuir"
				disabled={value <= min}
				onPress={() => onChange(Math.max(min, value - 1))}
			/>
			<DoneTextInput
				value={String(value)}
				onChangeText={(text) =>
					onChange(Number(text.replace(/\D/g, "").slice(0, MAX_DIGITS)))
				}
				onEndEditing={() => {
					if (value < min) onChange(min);
				}}
				keyboardType="number-pad"
				selectTextOnFocus
				accessibilityLabel="Quantidade"
				className="w-12 text-center font-sans-semibold text-[16px] text-foreground"
			/>
			<StepButton
				icon={PlusIcon}
				label="Aumentar"
				onPress={() => onChange(value + 1)}
			/>
		</View>
	);
}
