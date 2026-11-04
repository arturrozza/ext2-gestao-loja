import { Pressable, ScrollView } from "react-native";
import { Text } from "@/components/ui/text";
import { hapticSelect, withHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type ChoiceChipsProps<T extends string> = {
	options: readonly { value: T; label: string }[];
	value: T | undefined;
	onChange: (value: T) => void;
};

/** Single-choice chips in a horizontal scroll (filters, payment method, category...). */
export function ChoiceChips<T extends string>({
	options,
	value,
	onChange,
}: ChoiceChipsProps<T>) {
	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			contentContainerClassName="gap-2"
		>
			{options.map((option) => {
				const selected = option.value === value;
				return (
					<Pressable
						key={option.value}
						onPress={withHaptic(hapticSelect, () => onChange(option.value))}
						accessibilityRole="radio"
						accessibilityState={{ selected }}
						className={cn(
							"h-11 justify-center rounded-full px-5",
							selected ? "bg-primary" : "bg-card active:bg-accent",
						)}
					>
						<Text
							className={cn("text-sm", selected && "text-primary-foreground")}
						>
							{option.label}
						</Text>
					</Pressable>
				);
			})}
		</ScrollView>
	);
}
