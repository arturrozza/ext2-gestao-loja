import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { formatBRL, stockValue } from "@/lib/mock-erp-data";

const STATS = [
	{ label: "Vendas hoje", value: "23" },
	{ label: "Ticket médio", value: "R$ 123,82" },
	{ label: "Em estoque", value: formatBRL(stockValue()) },
];

export function QuickStats() {
	return (
		<View className="flex-row gap-3">
			{STATS.map((stat) => (
				<View key={stat.label} className="flex-1 gap-1 rounded-2xl bg-card p-4">
					<Text className="text-muted-foreground text-xs">{stat.label}</Text>
					<Text
						className="font-sans-semibold text-sm"
						numberOfLines={1}
						adjustsFontSizeToFit
					>
						{stat.value}
					</Text>
				</View>
			))}
		</View>
	);
}
