import { Link } from "expo-router";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

/** Black highlight block: today's real profit (the app's core number) and the main action. */
export function ProfitHighlight() {
	return (
		<View className="gap-5 rounded-3xl bg-secondary p-5">
			<View className="gap-1">
				<Text className="text-secondary-foreground/60 text-sm">
					Lucro real hoje
				</Text>
				<Text className="font-sans-semibold text-4xl text-secondary-foreground">
					R$ 812,40
				</Text>
				<Text className="text-secondary-foreground/60 text-sm">
					de R$ 2.847,90 vendidos · margem de 28%
				</Text>
			</View>
			<View className="flex-row gap-2">
				<Link href="/mock/new-sale" asChild>
					<Button className="flex-1 bg-primary">
						<Text>Nova venda</Text>
					</Button>
				</Link>
				<Link href="/mock/reports" asChild>
					<Button className="flex-1 bg-secondary-foreground/10 active:bg-secondary-foreground/20">
						<Text className="text-secondary-foreground">Relatórios</Text>
					</Button>
				</Link>
			</View>
		</View>
	);
}
