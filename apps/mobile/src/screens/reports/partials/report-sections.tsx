import { useState } from "react";
import { View } from "react-native";
import { ChoiceChips } from "@/components/choice-chips";
import { Figure, FigurePair } from "@/components/figure-pair";
import { InfoRow } from "@/components/info-row";
import { ListCard } from "@/components/list-card";
import { Text } from "@/components/ui/text";
import { plural, SALE_CHANNELS } from "@/lib/labels";
import { formatMoney, formatRatio, toCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Report } from "@/queries/reports/reports.types";
import { BarChart } from "./bar-chart";

/** Like the sales totals: sold and real profit side by side, then the numbers behind them. */
export function ReportSummary({ summary }: { summary: Report["summary"] }) {
	const profit = toCents(summary.profit);
	return (
		<View className="overflow-hidden rounded-2xl bg-background">
			<View className="p-5">
				<FigurePair>
					<Figure
						label="Vendido"
						value={formatMoney(summary.revenue)}
						note={plural(summary.count, "venda", "vendas")}
					/>
					<Figure
						label="Lucro real"
						value={formatMoney(summary.profit)}
						note={
							summary.margin === null
								? "sem margem"
								: `margem ${formatRatio(summary.margin)}`
						}
						danger={profit < 0}
						good={profit > 0}
					/>
				</FigurePair>
			</View>
			<View className="border-border border-t">
				<InfoRow
					label="Valor médio por venda"
					value={formatMoney(summary.averageTicket)}
				/>
			</View>
		</View>
	);
}

const EVOLUTION_TITLE: Record<Report["evolutionUnit"], string> = {
	day: "Evolução",
	week: "Evolução por semana",
	month: "Evolução por mês",
};

const EVOLUTION_METRICS = [
	{ value: "revenue", label: "Vendas" },
	{ value: "profit", label: "Lucro" },
] as const;

export function ReportEvolution({ report }: { report: Report }) {
	const [selectedKey, setSelectedKey] = useState<string | null>(null);
	const [metric, setMetric] = useState<"revenue" | "profit">("revenue");
	const points = (read: (b: Report["evolution"][number]) => string) =>
		report.evolution.map((bucket) => ({
			key: bucket.date,
			label: bucket.label,
			cents: toCents(read(bucket)),
		}));

	return (
		<View className="gap-3">
			<Text className="px-1 font-sans-semibold text-base">
				{EVOLUTION_TITLE[report.evolutionUnit]}
			</Text>
			<View className="gap-4 rounded-2xl bg-background p-4">
				<ChoiceChips
					options={EVOLUTION_METRICS}
					value={metric}
					onChange={setMetric}
				/>
				<BarChart
					title={metric === "revenue" ? "Vendas" : "Lucro"}
					points={points((b) => b[metric])}
					selectedKey={selectedKey}
					onSelect={setSelectedKey}
				/>
			</View>
		</View>
	);
}

export function ReportCosts({ costs }: { costs: Report["costs"] }) {
	return (
		<ListCard title="Custos">
			<InfoRow label="Produtos" value={formatMoney(costs.products)} />
			<InfoRow label="Frete" value={formatMoney(costs.freight)} />
			<InfoRow label="Imposto" value={formatMoney(costs.tax)} />
			<InfoRow label="Taxas" value={formatMoney(costs.fees)} />
			<InfoRow label="Comissões" value={formatMoney(costs.commissions)} />
			<InfoRow label="Outros" value={formatMoney(costs.other)} />
		</ListCard>
	);
}

function RevenueProfitRow({
	label,
	revenue,
	profit,
}: {
	label: string;
	revenue: string;
	profit: string;
}) {
	return (
		<View className="flex-row items-center justify-between gap-4 px-4 py-3">
			<Text className="flex-1 font-sans-medium text-sm" numberOfLines={1}>
				{label}
			</Text>
			<View className="items-end gap-0.5">
				<Text className="font-sans-semibold text-sm">
					{formatMoney(revenue)}
				</Text>
				<Text
					className={cn(
						"text-[11px]",
						toCents(profit) < 0 ? "text-destructive" : "text-success",
					)}
				>
					lucro {formatMoney(profit)}
				</Text>
			</View>
		</View>
	);
}

export function ReportChannels({ channels }: { channels: Report["channels"] }) {
	return (
		<ListCard title="Canais">
			{channels.map((row) => (
				<RevenueProfitRow
					key={row.channel}
					label={SALE_CHANNELS[row.channel]}
					revenue={row.revenue}
					profit={row.profit}
				/>
			))}
		</ListCard>
	);
}

export function ReportCategories({
	categories,
}: {
	categories: Report["categories"];
}) {
	return (
		<ListCard title="Categorias">
			{categories.map((row) => (
				<RevenueProfitRow
					key={row.name}
					label={row.name}
					revenue={row.revenue}
					profit={row.profit}
				/>
			))}
		</ListCard>
	);
}

export function ReportResellers({
	resellers,
}: {
	resellers: Report["resellers"];
}) {
	if (resellers.length === 0) return null;
	return (
		<ListCard title="Revendedoras">
			{resellers.map((row) => (
				<View
					key={row.id}
					className="flex-row items-center justify-between gap-4 px-4 py-3"
				>
					<Text className="flex-1 font-sans-medium text-sm" numberOfLines={1}>
						{row.name}
					</Text>
					<View className="items-end gap-0.5">
						<Text className="font-sans-semibold text-sm">
							{formatMoney(row.revenue)}
						</Text>
						<Text className="text-[11px] text-muted-foreground">
							comissão {formatMoney(row.commission)}
						</Text>
					</View>
				</View>
			))}
		</ListCard>
	);
}
