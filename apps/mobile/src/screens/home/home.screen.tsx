import { Text, View } from "react-native";
import { ApiStatus } from "./partials/api-status";

export function HomeScreen() {
	return (
		<View className="flex-1 items-center justify-center bg-white">
			<Text className="text-lg font-semibold">API</Text>
			<ApiStatus />
		</View>
	);
}
