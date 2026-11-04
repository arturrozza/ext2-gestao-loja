import { Text } from "@/components/ui/text";
import { useHealth } from "@/queries/health/use-health";

export function ApiStatus() {
	const { data, isPending, isError } = useHealth();

	if (isPending)
		return <Text className="text-muted-foreground">Checando...</Text>;
	if (isError) return <Text className="text-destructive">Indisponível</Text>;

	return (
		<Text className="text-muted-foreground">
			{data.status} · db {data.database}
		</Text>
	);
}
