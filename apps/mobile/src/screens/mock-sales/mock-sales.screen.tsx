import { useState } from "react";
import { View } from "react-native";
import Animated, {
	FadeIn,
	FadeOut,
	LinearTransition,
} from "react-native-reanimated";
import { ChoiceChips } from "@/components/choice-chips";
import { SaleCard } from "@/components/sale-card";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import {
	type Channel,
	formatBRL,
	MOCK_SALES,
	saleProfit,
	saleTotal,
} from "@/lib/mock-erp-data";

const CHANNELS = [
	{ value: "all", label: "Todas" },
	{ value: "store", label: "Loja" },
	{ value: "ml", label: "Mercado Livre" },
	{ value: "reseller", label: "Revendedoras" },
] as const;

type ChannelFilter = "all" | Channel;

const layoutTransition = LinearTransition.duration(240);

function Totals({
	revenue,
	profit,
	count,
}: {
	revenue: number;
	profit: number;
	count: number;
}) {
	return (
		<View className="flex-row gap-3">
			<View className="flex-1 gap-1 rounded-2xl bg-card p-4">
				<Text className="text-muted-foreground text-xs">
					Receita · {count} vendas
				</Text>
				<Text className="font-sans-semibold">{formatBRL(revenue)}</Text>
			</View>
			<View className="flex-1 gap-1 rounded-2xl bg-card p-4">
				<Text className="text-muted-foreground text-xs">Lucro real</Text>
				<Text className="font-sans-semibold">{formatBRL(profit)}</Text>
			</View>
		</View>
	);
}

export function MockSalesScreen() {
	const [channel, setChannel] = useState<ChannelFilter>("all");
	const [search, setSearch] = useState("");

	const query = search.trim().toLowerCase();
	const sales = MOCK_SALES.filter(
		(s) =>
			(channel === "all" || s.channel === channel) &&
			s.customer.toLowerCase().includes(query),
	);
	const done = sales.filter((s) => s.status !== "canceled");

	return (
		<ScreenLayout
			bottom="tabs"
			header={<ScreenHeader variant="large" title="Vendas" />}
		>
			<View className="gap-3">
				<Input
					placeholder="Buscar cliente ou pedido..."
					value={search}
					onChangeText={setSearch}
				/>
				<ChoiceChips options={CHANNELS} value={channel} onChange={setChannel} />
			</View>

			<Totals
				revenue={done.reduce((sum, s) => sum + saleTotal(s), 0)}
				profit={done.reduce((sum, s) => sum + saleProfit(s), 0)}
				count={done.length}
			/>

			<Animated.View layout={layoutTransition}>
				<View className="gap-3">
					{sales.map((sale) => (
						<Animated.View
							key={sale.id}
							entering={FadeIn.duration(200)}
							exiting={FadeOut.duration(120)}
						>
							<SaleCard sale={sale} />
						</Animated.View>
					))}
					{sales.length === 0 ? (
						<Text className="py-8 text-center text-muted-foreground">
							Nenhuma venda encontrada.
						</Text>
					) : null}
				</View>
			</Animated.View>
		</ScreenLayout>
	);
}
