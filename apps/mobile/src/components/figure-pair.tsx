import { Children, isValidElement, type ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/** A big number with its label above and a short note under it (sold, real profit...). */
export function Figure({
	label,
	value,
	note,
	danger = false,
	good = false,
	struck = false,
}: {
	label: string;
	value: string;
	note?: string;
	danger?: boolean;
	/** A positive profit: green. */
	good?: boolean;
	/** Canceled: the number stays readable, crossed out. */
	struck?: boolean;
}) {
	return (
		<View className="flex-1 gap-1.5">
			<Text className="font-sans-medium text-muted-foreground text-xs">
				{label}
			</Text>
			<Text
				className={cn(
					"font-sans-bold text-[22px] tracking-tight",
					danger && "text-destructive",
					good && "text-success",
					struck && "text-muted-foreground line-through",
				)}
				numberOfLines={1}
				adjustsFontSizeToFit
			>
				{value}
			</Text>
			{note ? (
				<Text className="text-muted-foreground text-xs" numberOfLines={1}>
					{note}
				</Text>
			) : null}
		</View>
	);
}

/** Two `Figure`s side by side with a thin divider between them. */
export function FigurePair({ children }: { children: ReactNode }) {
	const [first, second] = Children.toArray(children).filter(isValidElement);
	return (
		<View className="flex-row">
			{first}
			<View className="mx-5 w-px bg-border" />
			{second}
		</View>
	);
}
