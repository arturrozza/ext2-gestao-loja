import { Pressable, ScrollView } from "react-native";
import { Text } from "@/components/ui/text";
import { hapticSelect, withHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type ChoiceChipsProps<T extends string> = {
	options: readonly { value: T; label: string }[];
	value: T | undefined;
	onChange: (value: T) => void;
	/** `page`: chips sit on the gray page (white when unselected). `field`: on white, the gray of the form fields. */
	surface?: "page" | "field";
};

/** Single-choice chips in a horizontal scroll (filters, payment method, category...). */
export function ChoiceChips<T extends string>({
	options,
	value,
	onChange,
	surface = "field",
}: ChoiceChipsProps<T>) {
	const idle = surface === "page" ? "bg-background" : "bg-field";
	const chips = options.map((option) => {
		const selected = option.value === value;
		return (
			<Pressable
				key={option.value}
				onPress={withHaptic(hapticSelect, () => onChange(option.value))}
				accessibilityRole="radio"
				accessibilityState={{ selected }}
				className={cn(
					"h-9 justify-center rounded-full px-3.5",
					selected ? "bg-primary" : cn(idle, "active:bg-accent"),
				)}
			>
				<Text
					className={cn("text-[13px]", selected && "text-primary-foreground")}
				>
					{option.label}
				</Text>
			</Pressable>
		);
	});

	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			className={surface === "page" ? "-mx-5" : undefined}
			contentContainerClassName={cn("gap-2", surface === "page" && "px-5")}
		>
			{chips}
		</ScrollView>
	);
}
