import { Link } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { ApiStatus } from "./partials/api-status";

export function HomeScreen() {
	const insets = useSafeAreaInsets();

	return (
		<View
			className="flex-1 justify-end gap-6 bg-background px-4"
			style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}
		>
			<View className="gap-1">
				<Text className="font-sans-bold text-3xl tracking-tight">Loja</Text>
				<ApiStatus />
			</View>
			<View className="gap-2">
				<Link href="/mock/dashboard" asChild>
					<Button size="lg">
						<Text>Ver protótipo do ERP</Text>
					</Button>
				</Link>
				<Link
					href={{ pathname: "/mock/dashboard", params: { empty: "1" } }}
					asChild
				>
					<Button size="lg" variant="outline">
						<Text>Ver loja começando (vazia)</Text>
					</Button>
				</Link>
				<Link href="/design-system" asChild>
					<Button size="lg" variant="outline">
						<Text>Ver design system</Text>
					</Button>
				</Link>
			</View>
		</View>
	);
}
