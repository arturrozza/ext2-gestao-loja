import { Text } from "react-native";
import { useHealth } from "@/queries/health/use-health";

export function ApiStatus() {
	const { data, isPending, isError } = useHealth();

	if (isPending)
		return <Text className="text-base text-neutral-600">Checando...</Text>;
	if (isError)
		return <Text className="text-base text-red-600">Indisponível</Text>;

	return (
		<Text className="text-base text-neutral-600">
			{data.status} · db {data.database}
		</Text>
	);
}
