import type { ReactNode } from "react";
import { View } from "react-native";
import { Icon, type IconType } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/**
 * Read-only "label ... value" line inside a white card. A missing value shows a dash. `icon` is the loose gray icon
 * before the label, the same as a `ListRow`'s; give it to every row of a card or to none, so the labels line up.
 */
export function InfoRow({
	icon,
	label,
	value,
	strong = false,
	valueClassName,
	right,
}: {
	icon?: IconType;
	label: string;
	value?: string | null;
	strong?: boolean;
	valueClassName?: string;
	/** Replaces the value text (e.g. a pill). */
	right?: ReactNode;
}) {
	return (
		<View className="flex-row items-center justify-between gap-4 px-4 py-3">
			<View className="flex-row items-center gap-3">
				{icon ? (
					<Icon as={icon} size={20} className="text-foreground/50" />
				) : null}
				<Text
					className={cn(
						"text-sm",
						strong ? "font-sans-semibold" : "text-muted-foreground",
					)}
				>
					{label}
				</Text>
			</View>
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
