import { Text } from "@/components/ui/text";

/** The red line under a field or section. Nothing when there's no error. */
export function FieldError({ error }: { error?: string | null }) {
	if (!error) return null;
	return <Text className="px-1 text-destructive text-sm">{error}</Text>;
}
