import { View } from "react-native";
import {
	BreakdownRows,
	type SaleBreakdownData,
} from "@/components/sale-breakdown";
import { Text } from "@/components/ui/text";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/** The three parts of the revenue, in the order they're paid: products, sale costs, what's left. */
const PARTS = [
	{ key: "products", label: "Custo dos produtos", tone: "bg-foreground/25" },
	{ key: "costs", label: "Taxas, frete e impostos", tone: "bg-foreground/10" },
	{ key: "profit", label: "Lucro real", tone: "bg-success" },
] as const;

function shares(data: SaleBreakdownData) {
	const costs = data.costs.reduce((sum, cost) => sum + cost.amountCents, 0);
	const values = {
		products: data.productsCostCents,
		costs,
		profit: Math.max(0, data.profitCents),
	};
	const total = values.products + values.costs + values.profit || 1;
	return { values, total };
}

/** One bar split by where the revenue went. A loss has no profit part: the costs fill the bar. */
function SplitBar({ data }: { data: SaleBreakdownData }) {
	const { values, total } = shares(data);
	return (
		<View className="h-3 flex-row gap-0.5 overflow-hidden rounded-[4px]">
			{PARTS.filter((part) => values[part.key] > 0).map((part) => (
				<View
					key={part.key}
					className={part.tone}
					style={{ flex: values[part.key] / total }}
				/>
			))}
		</View>
	);
}

function Legend({ data }: { data: SaleBreakdownData }) {
	const { values } = shares(data);
	return (
		<View className="gap-2.5">
			{PARTS.map((part) => {
				const cents =
					part.key === "profit" ? data.profitCents : values[part.key];
				return (
					<View key={part.key} className="flex-row items-center gap-2.5">
						<View className={cn("h-2.5 w-2.5 rounded-[3px]", part.tone)} />
						<Text className="flex-1 text-muted-foreground text-sm">
							{part.label}
						</Text>
						<Text
							className={cn(
								"font-sans-semibold text-sm",
								cents < 0 && "text-destructive",
								part.key === "profit" && cents > 0 && "text-success",
							)}
						>
							{formatMoney(cents)}
						</Text>
					</View>
				);
			})}
		</View>
	);
}

/**
 * Where the money of the sale went (vendas.md, "Lucro real"): a bar of the revenue split into product cost, sale costs
 * and profit, its legend, then every line of the calculation.
 */
export function MoneySplit({ data }: { data: SaleBreakdownData }) {
	return (
		<View className="gap-3">
			<Text className="px-1 font-sans-semibold text-base">
				Para onde foi o dinheiro
			</Text>
			<View className="overflow-hidden rounded-2xl bg-background">
				<View className="gap-4 p-5 pb-4">
					<SplitBar data={data} />
					<Legend data={data} />
				</View>
				<View className="border-border border-t">
					<BreakdownRows data={data} />
				</View>
			</View>
		</View>
	);
}
