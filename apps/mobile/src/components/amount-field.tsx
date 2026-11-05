import { Pressable, View } from "react-native";
import { DoneTextInput } from "@/components/done-text-input";
import { Text } from "@/components/ui/text";
import { hapticSelect, withHaptic } from "@/lib/haptics";
import { THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";

export type AmountMode = "amount" | "percent";

const MODES: { value: AmountMode; label: string }[] = [
	{ value: "amount", label: "R$" },
	{ value: "percent", label: "%" },
];

/**
 * A value in reais or a percentage, in one field: the unit switch sits inside it, on the right, so the number and its
 * unit read together. The switch is a small pill, its segments pills too (pill in pill stays parallel).
 */
export function AmountField({
	value,
	onChangeText,
	mode,
	onModeChange,
	label,
	error,
}: {
	value: string;
	onChangeText: (text: string) => void;
	mode: AmountMode;
	onModeChange: (mode: AmountMode) => void;
	/** For screen readers; the visible label sits above the field. */
	label: string;
	error?: string;
}) {
	return (
		<View className="gap-2">
			<View
				className={cn(
					"h-12 flex-row items-center rounded-[8px] border border-transparent bg-field pr-1 pl-4",
					error && "border-destructive",
				)}
			>
				{mode === "amount" ? (
					<Text className="pr-1.5 text-base text-muted-foreground">R$</Text>
				) : null}
				<DoneTextInput
					value={value}
					onChangeText={onChangeText}
					keyboardType="decimal-pad"
					placeholder={mode === "amount" ? "0,00" : "0"}
					placeholderTextColor={THEME.mutedForeground}
					accessibilityLabel={label}
					className="h-full flex-1 font-sans text-[16px] text-foreground"
				/>
				{mode === "percent" ? (
					<Text className="pr-3 text-base text-muted-foreground">%</Text>
				) : null}
				<View className="flex-row rounded-full bg-field-raised p-1">
					{MODES.map((option) => {
						const on = option.value === mode;
						return (
							<Pressable
								key={option.value}
								onPress={withHaptic(hapticSelect, () =>
									onModeChange(option.value),
								)}
								accessibilityRole="radio"
								accessibilityState={{ selected: on }}
								accessibilityLabel={
									option.value === "amount" ? "Em reais" : "Em porcentagem"
								}
								className={cn(
									"h-8 w-10 items-center justify-center rounded-full",
									on && "bg-primary",
								)}
							>
								<Text
									className={cn(
										"font-sans-semibold text-sm",
										on ? "text-primary-foreground" : "text-muted-foreground",
									)}
								>
									{option.label}
								</Text>
							</Pressable>
						);
					})}
				</View>
			</View>
			{error ? (
				<Text className="px-1 text-destructive text-sm">{error}</Text>
			) : null}
		</View>
	);
}
