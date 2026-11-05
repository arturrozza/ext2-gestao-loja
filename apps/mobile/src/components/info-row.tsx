import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/** Read-only "label ... value" line inside a white card. A missing value shows a dash. */
export function InfoRow({
	label,
	value,
	strong = false,
	valueClassName,
	right,
}: {
	label: string;
	value?: string | null;
	strong?: boolean;
	valueClassName?: string;
	/** Replaces the value text (e.g. a pill). */
	right?: ReactNode;
}) {
	return (
		<View className="flex-row items-center justify-between gap-4 px-4 py-3">
			<Text
				className={cn(
					"text-sm",
					strong ? "font-sans-semibold" : "text-muted-foreground",
				)}
			>
				{label}
			</Text>
			{right ?? (
				<Text
					className={cn(
						"shrink text-right text-sm",
						strong ? "font-sans-semibold" : "font-sans-medium",
						!value && "text-muted-foreground",
						valueClassName,
					)}
				>
					{value || "—"}
				</Text>
			)}
		</View>
	);
}
