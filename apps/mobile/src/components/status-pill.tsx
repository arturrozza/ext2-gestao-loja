import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "highlight" | "danger";

const CONTAINER: Record<Tone, string> = {
	neutral: "bg-card",
	highlight: "bg-primary/10",
	danger: "bg-destructive/10",
};

const LABEL: Record<Tone, string> = {
	neutral: "text-muted-foreground",
	highlight: "text-primary",
	danger: "text-destructive",
};

export function StatusPill({
	label,
	tone = "neutral",
}: {
	label: string;
	tone?: Tone;
}) {
	return (
		<View
			className={cn("self-start rounded-full px-2.5 py-1", CONTAINER[tone])}
		>
			<Text className={cn("font-sans-medium text-xs", LABEL[tone])}>
				{label}
			</Text>
		</View>
	);
}
