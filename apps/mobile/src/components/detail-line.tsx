import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

type DetailLineProps = {
	label: string;
	value: string;
	strong?: boolean;
	valueClassName?: string;
};

/** "Label ........ value" row used inside summary boxes. */
export function DetailLine({
	label,
	value,
	strong = false,
	valueClassName,
}: DetailLineProps) {
	return (
		<View className="flex-row justify-between gap-3">
			<Text
				className={cn(
					"flex-1",
					strong ? "font-sans-semibold" : "text-muted-foreground text-sm",
				)}
				numberOfLines={1}
			>
				{label}
			</Text>
			<Text
				className={cn(
					strong ? "font-sans-semibold" : "font-sans-medium text-sm",
					valueClassName,
				)}
			>
				{value}
			</Text>
		</View>
	);
}
