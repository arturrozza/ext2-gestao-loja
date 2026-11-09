import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { formatMoment } from "@/lib/dates";

/** Nothing while active; once canceled, "Cancelada há 2 dias", the reason in its own line, and what the cancellation changed. */
export function CanceledNote({
	canceledAt,
	reason,
	consequence,
}: {
	canceledAt: string | null;
	reason: string | null;
	consequence: string;
}) {
	if (!canceledAt) return null;
	return (
		<View className="gap-1 rounded-[8px] bg-destructive/10 px-4 py-3">
			<Text className="font-sans-semibold text-destructive text-sm">
				Cancelada {formatMoment(canceledAt).toLowerCase()}
			</Text>
			{reason ? (
				<Text className="text-destructive text-sm">“{reason}”</Text>
			) : null}
			<Text className="text-destructive text-sm">{consequence}</Text>
		</View>
	);
}
