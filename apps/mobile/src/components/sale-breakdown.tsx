import { WarningIcon } from "phosphor-react-native/src/icons/Warning";
import { View } from "react-native";
import { InfoRow } from "@/components/info-row";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { formatMoney, formatRatio } from "@/lib/money";
import { cn } from "@/lib/utils";

export type SaleBreakdownData = {
	grossCents: number;
	discountCents: number;
	surchargeCents: number;
	revenueCents: number;
	productsCostCents: number;
	costs: { key: string; label: string; amountCents: number }[];
	profitCents: number;
	margin: number | null;
};

/**
 * Every line of the calculation, from the products' total to the margin. Profit is green, a loss red. Shared by the
 * live preview of a new sale and the stored numbers of a registered one.
 */
export function BreakdownRows({ data }: { data: SaleBreakdownData }) {
	const loss = data.profitCents < 0;
	return (
		<>
			<InfoRow label="Produtos" value={formatMoney(data.grossCents)} />
			{data.discountCents > 0 ? (
				<InfoRow label="Desconto" value={formatMoney(-data.discountCents)} />
			) : null}
			{data.surchargeCents > 0 ? (
				<InfoRow label="Acréscimo" value={formatMoney(data.surchargeCents)} />
			) : null}
			<InfoRow label="Receita" value={formatMoney(data.revenueCents)} strong />
			<InfoRow
				label="Custo dos produtos"
				value={formatMoney(-data.productsCostCents)}
			/>
			{data.costs.map((cost) => (
				<InfoRow
					key={cost.key}
					label={cost.label}
					value={formatMoney(-cost.amountCents)}
				/>
			))}
			<InfoRow
				label="Lucro real"
				value={formatMoney(data.profitCents)}
				strong
				valueClassName={cn(
					loss && "text-destructive",
					data.profitCents > 0 && "text-success",
				)}
			/>
			<InfoRow
				label="Margem"
				value={data.margin === null ? "—" : formatRatio(data.margin)}
				valueClassName={cn(loss && "text-destructive")}
			/>
		</>
	);
}

/**
 * Where the money of a sale goes (vendas.md, "Cálculos"): the live preview of a new sale and the stored numbers of a
 * registered one. `warnLoss`: a sale still being typed warns about the loss but lets it through.
 */
export function SaleBreakdown({
	title,
	data,
	warnLoss = false,
}: {
	title: string;
	data: SaleBreakdownData;
	warnLoss?: boolean;
}) {
	const loss = data.profitCents < 0;

	return (
		<View className="gap-3">
			<Text className="px-1 font-sans-semibold text-base">{title}</Text>
			<View className="overflow-hidden rounded-2xl bg-background">
				<BreakdownRows data={data} />
				{warnLoss && loss ? (
					<View className="flex-row items-center gap-2 bg-destructive/10 px-4 py-3">
						<Icon as={WarningIcon} size={18} className="text-destructive" />
						<Text className="flex-1 text-destructive text-sm">
							Esta venda dá prejuízo de {formatMoney(-data.profitCents)}. Dá
							para concluir mesmo assim.
						</Text>
					</View>
				) : null}
			</View>
		</View>
	);
}
