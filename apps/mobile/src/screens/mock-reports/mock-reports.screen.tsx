import { useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { ChoiceChips } from "@/components/choice-chips";
import { DetailLine } from "@/components/detail-line";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { SectionTitle } from "@/components/section-title";
import { Text } from "@/components/ui/text";
import {
	CHANNEL_LABEL,
	formatBRL,
	formatPercent,
	MOCK_REPORT,
	stockValue,
} from "@/lib/mock-erp-data";
import { cn } from "@/lib/utils";

const PERIODS = [
	{ value: "7d", label: "7 dias" },
	{ value: "month", label: "Este mês" },
	{ value: "30d", label: "30 dias" },
	{ value: "year", label: "Ano" },
] as const;

type Period = (typeof PERIODS)[number]["value"];

function Summary() {
	const { revenue, profit, salesCount, averageTicket } = MOCK_REPORT;

	return (
		<View className="gap-4 rounded-3xl bg-secondary p-5">
			<View className="gap-1">
				<Text className="text-secondary-foreground/60 text-sm">Lucro real</Text>
				<Text className="font-sans-semibold text-4xl text-secondary-foreground">
					{formatBRL(profit)}
				</Text>
				<Text className="text-secondary-foreground/60 text-sm">
					margem de {formatPercent(profit / revenue)}
				</Text>
			</View>
			<View className="flex-row gap-3">
				{[
					{ label: "Receita", value: formatBRL(revenue) },
					{ label: "Vendas", value: String(salesCount) },
					{ label: "Ticket médio", value: formatBRL(averageTicket) },
				].map((stat) => (
					<View
						key={stat.label}
						className="flex-1 gap-0.5 rounded-2xl bg-secondary-foreground/10 p-3"
					>
						<Text className="text-secondary-foreground/60 text-xs">
							{stat.label}
						</Text>
						<Text
							className="font-sans-semibold text-secondary-foreground text-sm"
							numberOfLines={1}
							adjustsFontSizeToFit
						>
							{stat.value}
						</Text>
					</View>
				))}
			</View>
		</View>
	);
}

function DailyChart() {
	const max = Math.max(...MOCK_REPORT.daily.map((d) => d.revenue));
	const last = MOCK_REPORT.daily.length - 1;

	return (
		<View className="h-48 flex-row items-end gap-2 rounded-3xl bg-card p-4">
			{MOCK_REPORT.daily.map((d, index) => (
				<View key={d.day} className="flex-1 items-center gap-2">
					<View
						className={cn(
							"w-full rounded-xl",
							index === last ? "bg-primary" : "bg-muted",
						)}
						style={{ height: Math.max(8, (d.revenue / max) * 120) }}
					/>
					<Text
						className={cn(
							"text-xs",
							index === last ? "font-sans-semibold" : "text-muted-foreground",
						)}
					>
						{d.day}
					</Text>
				</View>
			))}
		</View>
	);
}

function CostBars() {
	const total = MOCK_REPORT.costs.reduce((sum, c) => sum + c.value, 0);

	return (
		<View className="gap-4 rounded-3xl bg-card p-4">
			{MOCK_REPORT.costs.map((cost) => (
				<View key={cost.label} className="gap-1.5">
					<DetailLine label={cost.label} value={formatBRL(cost.value)} />
					<View className="h-2 overflow-hidden rounded-full bg-muted">
						<View
							className="h-2 rounded-full bg-primary"
							style={{ width: `${(cost.value / total) * 100}%` }}
						/>
					</View>
				</View>
			))}
		</View>
	);
}

function Channels() {
	return (
		<View className="gap-3">
			{MOCK_REPORT.channels.map((c) => (
				<View
					key={c.channel}
					className="flex-row items-center gap-3 rounded-3xl border border-border p-4"
				>
					<View className="flex-1 gap-0.5">
						<Text className="font-sans-medium">{CHANNEL_LABEL[c.channel]}</Text>
						<Text className="text-muted-foreground text-xs">
							{c.count} vendas · {formatBRL(c.revenue)}
						</Text>
					</View>
					<View className="items-end">
						<Text className="font-sans-semibold">{formatBRL(c.profit)}</Text>
						<Text className="text-muted-foreground text-xs">
							margem {formatPercent(c.profit / c.revenue)}
						</Text>
					</View>
				</View>
			))}
		</View>
	);
}

export function MockReportsScreen() {
	const [period, setPeriod] = useState<Period>("month");

	return (
		<ScreenLayout header={<ScreenHeader title="Relatórios" />}>
			<ChoiceChips options={PERIODS} value={period} onChange={setPeriod} />
			<Animated.View
				key={period}
				entering={FadeIn.duration(260)}
				layout={LinearTransition.duration(240)}
			>
				<View className="gap-6">
					<Summary />
					<View className="gap-3">
						<SectionTitle title="Receita por dia" />
						<DailyChart />
					</View>
					<View className="gap-3">
						<SectionTitle title="Para onde vai o dinheiro" />
						<CostBars />
					</View>
					<View className="gap-3">
						<SectionTitle title="Vendas por canal" />
						<Channels />
					</View>
					<View className="gap-3">
						<SectionTitle title="Mais vendidos" />
						<View className="gap-2.5 rounded-3xl bg-card p-4">
							{MOCK_REPORT.topProducts.map((p, index) => (
								<DetailLine
									key={p.name}
									label={`${index + 1}. ${p.name}`}
									value={`${p.quantity} un.`}
								/>
							))}
						</View>
					</View>
					<DetailLine
						label="Valor em estoque agora"
						value={formatBRL(stockValue())}
						strong
					/>
				</View>
			</Animated.View>
		</ScreenLayout>
	);
}
