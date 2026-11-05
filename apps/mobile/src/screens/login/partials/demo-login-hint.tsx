import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { FAKE_LOGIN } from "@/queries/fake/fake-db";

/** FAKE DATA (MUN-21): demo account while the app runs without the API. Removed in MUN-20. */
export function DemoLoginHint({
	onFill,
}: {
	onFill: (email: string, password: string) => void;
}) {
	return (
		<View className="gap-3 rounded-2xl border border-border border-dashed p-4">
			<View className="gap-0.5">
				<Text className="font-sans-semibold text-sm">
					Conta de demonstração
				</Text>
				<Text className="text-muted-foreground text-xs">
					{FAKE_LOGIN.email} · {FAKE_LOGIN.password}
				</Text>
			</View>
			<Button
				size="sm"
				variant="outline"
				className="self-start bg-background"
				onPress={() => onFill(FAKE_LOGIN.email, FAKE_LOGIN.password)}
			>
				<Text>Preencher</Text>
			</Button>
		</View>
	);
}
