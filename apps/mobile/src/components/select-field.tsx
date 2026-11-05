import { type ReactNode, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { BottomSheet } from "@/components/bottom-sheet";
import { PickerTrigger } from "@/components/picker-trigger";
import { Radio } from "@/components/radio";
import { Icon, type IconType } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticSelect, withHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/** One choice. `icon` shows beside it in the field and in the list. */
export type SelectOption<T extends string> = {
	value: T;
	label: string;
	icon?: IconType;
};

/**
 * Field that picks one option from a sheet (channel, payment...): looks like an input, shows the choice, opens a list.
 * Better than chips when there are several options or the field sits among others in a form.
 */
export function SelectField<T extends string>({
	label,
	options,
	value,
	onChange,
	placeholder = "Escolher",
	error,
	action,
}: {
	label: string;
	options: readonly SelectOption<T>[];
	value: T | undefined;
	onChange: (value: T) => void;
	placeholder?: string;
	error?: string;
	/** Small control on the right of the label (e.g. "+ Nova"). */
	action?: ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const current = options.find((option) => option.value === value);

	return (
		<View>
			<PickerTrigger
				label={label}
				icon={current?.icon}
				value={current?.label ?? null}
				placeholder={placeholder}
				error={error}
				action={action}
				onPress={() => setOpen(true)}
			/>
			<BottomSheet
				open={open}
				onClose={() => setOpen(false)}
				title={label}
				dragFromTop
			>
				<ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
					<View className="gap-2">
						{options.map((option) => {
							const selected = option.value === value;
							return (
								<Pressable
									key={option.value}
									onPress={withHaptic(hapticSelect, () => {
										onChange(option.value);
										setOpen(false);
									})}
									accessibilityRole="radio"
									accessibilityState={{ selected }}
									// 24px sheet, 12px inset: 12px rows keep the curves parallel.
									className={cn(
										"flex-row items-center gap-3 rounded-xl px-4 py-4",
										selected ? "bg-primary/10" : "bg-card active:bg-accent",
									)}
								>
									{option.icon ? (
										<Icon
											as={option.icon}
											weight="regular"
											size={22}
											className={
												selected ? "text-primary" : "text-foreground/60"
											}
										/>
									) : null}
									<Text
										className={cn(
											"flex-1 text-[15px]",
											selected ? "font-sans-semibold" : "font-sans-medium",
										)}
									>
										{option.label}
									</Text>
									<Radio on={selected} />
								</Pressable>
							);
						})}
					</View>
				</ScrollView>
			</BottomSheet>
		</View>
	);
}
