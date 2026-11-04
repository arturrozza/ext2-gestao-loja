import { ReceiptText, ShoppingBag, Store, Users } from "lucide-react-native";
import { View } from "react-native";
import { DetailLine } from "@/components/detail-line";
import { ExpandableRow } from "@/components/expandable-row";
import { Price } from "@/components/price";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
	CHANNEL_LABEL,
	type Channel,
	formatBRL,
	formatPercent,
	type MockSale,
	type SaleStatus,
	saleProductCost,
	saleProfit,
	saleTotal,
} from "@/lib/mock-erp-data";

const STATUS: Record<
	SaleStatus,
	{ label: string; tone: "neutral" | "highlight" | "danger" }
> = {
	paid: { label: "Concluída", tone: "neutral" },
	pending: { label: "Acerto pendente", tone: "highlight" },
	canceled: { label: "Cancelada", tone: "danger" },
};

const CHANNEL_ICON: Record<Channel, typeof Store> = {
	store: Store,
	ml: ShoppingBag,
	reseller: Users,
};

function SaleSummary({ sale }: { sale: MockSale }) {
	return (
		<View className="flex-row items-center gap-3">
			<View className="h-14 w-14 items-center justify-center rounded-2xl bg-card">
				<Icon
					as={CHANNEL_ICON[sale.channel]}
					size={22}
					className="text-muted-foreground"
				/>
			</View>
			<View className="flex-1 gap-1">
				<Text className="font-sans-medium" numberOfLines={1}>
					{sale.customer}
				</Text>
				<StatusPill {...STATUS[sale.status]} />
			</View>
			<View className="items-end gap-0.5">
				<Price value={saleTotal(sale)} className="text-base" />
				<Text className="text-muted-foreground text-xs">{sale.time}</Text>
			</View>
		</View>
	);
}

function ProfitBox({ sale }: { sale: MockSale }) {
	const total = saleTotal(sale);
	const profit = saleProfit(sale);

	return (
		<View className="gap-2.5 rounded-2xl bg-card p-4">
			<DetailLine label="Receita" value={formatBRL(total)} />
			<DetailLine
				label="Custo dos produtos"
				value={`− ${formatBRL(saleProductCost(sale))}`}
			/>
			{sale.costs.map((cost) => (
				<DetailLine
					key={cost.label}
					label={cost.label}
					value={`− ${formatBRL(cost.value)}`}
				/>
			))}
			<View className="h-px bg-border" />
			<DetailLine
				label={`Lucro real · ${formatPercent(profit / total)}`}
				value={formatBRL(profit)}
				strong
				valueClassName={profit < 0 ? "text-destructive" : undefined}
			/>
		</View>
	);
}

function SaleDetails({ sale }: { sale: MockSale }) {
	return (
		<View className="gap-3">
			<View className="gap-2 px-1">
				{sale.items.map((item) => (
					<DetailLine
						key={item.name}
						label={`${item.quantity}× ${item.name}`}
						value={formatBRL(item.quantity * item.price)}
					/>
				))}
				<DetailLine
					label="Canal"
					value={
						sale.reseller
							? `Revendedora · ${sale.reseller}`
							: CHANNEL_LABEL[sale.channel]
					}
				/>
				<DetailLine label="Pagamento" value={sale.payment} />
			</View>
			<ProfitBox sale={sale} />
			<View className="flex-row gap-2">
				<Button variant="outline" size="sm" className="flex-1">
					<Icon as={ReceiptText} size={16} />
					<Text>Recibo</Text>
				</Button>
				{sale.status !== "canceled" ? (
					<Button variant="ghost" size="sm" className="flex-1">
						<Text className="text-destructive">Cancelar venda</Text>
					</Button>
				) : null}
			</View>
		</View>
	);
}

/** Sale as an expandable card: summary on top, items + cost composition + real profit when opened. */
export function SaleCard({ sale }: { sale: MockSale }) {
	return (
		<ExpandableRow summary={<SaleSummary sale={sale} />}>
			<SaleDetails sale={sale} />
		</ExpandableRow>
	);
}
