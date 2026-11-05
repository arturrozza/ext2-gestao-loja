import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Figure, FigurePair } from "@/components/figure-pair";
import { InfoRow } from "@/components/info-row";
import { ItemRow } from "@/components/item-row";
import { ListCard } from "@/components/list-card";
import { ProductThumb } from "@/components/product-thumb";
import type { SaleBreakdownData } from "@/components/sale-breakdown";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { ScreenQuery } from "@/components/screen-query";
import { ThumbStack } from "@/components/thumb-stack";
import { Text } from "@/components/ui/text";
import { formatMoment } from "@/lib/dates";
import {
	PAYMENT_CONDITIONS,
	PAYMENT_METHODS,
	plural,
	SALE_CHANNELS,
	SALE_COST_KINDS,
	times,
} from "@/lib/labels";
import { formatMoney, formatPercent, formatRatio } from "@/lib/money";
import type {
	SaleCost,
	SaleDetail,
	SaleItem,
} from "@/queries/sales/sales.types";
import { useSale } from "@/queries/sales/use-sales";
import { CancelSale } from "./partials/cancel-sale";
import { MoneySplit } from "./partials/money-split";

function costLabel(cost: SaleCost) {
	const name = cost.label || SALE_COST_KINDS[cost.kind];
	return cost.mode === "percent"
		? `${name} (${formatPercent(cost.value)})`
		: name;
}

/** The stored numbers of the sale: nothing is recomputed. */
function breakdownOf(sale: SaleDetail): SaleBreakdownData {
	const discountCents = sale.discount;
	const surchargeCents = sale.surcharge;
	const revenueCents = sale.revenue;
	return {
		grossCents: revenueCents + discountCents - surchargeCents,
		discountCents,
		surchargeCents,
		revenueCents,
		productsCostCents: sale.productsCost,
		costs: sale.costs.map((cost) => ({
			key: cost.id,
			label: costLabel(cost),
			amountCents: cost.amount,
		})),
		profitCents: sale.profit,
		margin: sale.margin,
	};
}

/** Who bought and through where, in one line: "Loja · Ana Paula Ribeiro". */
function partiesLine(sale: SaleDetail) {
	return [sale.resellerName ?? SALE_CHANNELS[sale.channel], sale.customerName]
		.filter(Boolean)
		.join(" · ");
}

function CanceledNote({ sale }: { sale: SaleDetail }) {
	if (!sale.canceledAt) return null;
	return (
		<View className="gap-1 rounded-[8px] bg-destructive/10 px-4 py-3">
			<Text className="font-sans-semibold text-destructive text-sm">
				Cancelada {formatMoment(sale.canceledAt).toLowerCase()}
			</Text>
			<Text className="text-destructive text-sm">
				{sale.cancelReason ?? "Sem motivo"}. Não conta nos relatórios nem nas
				comissões.
			</Text>
		</View>
	);
}

/** The top card: what was sold and when, then the two numbers that matter. */
function Summary({ sale }: { sale: SaleDetail }) {
	const canceled = sale.status === "canceled";
	const loss = sale.profit < 0;
	return (
		<View className="gap-5 rounded-2xl bg-background p-5">
			<View className="flex-row items-center gap-3.5">
				<View className={canceled ? "opacity-40" : undefined}>
					<ThumbStack items={sale.preview} total={sale.productCount} fit />
				</View>
				<View className="flex-1 gap-1">
					<Text className="font-sans-semibold text-[15px]" numberOfLines={1}>
						{formatMoment(sale.createdAt)}
					</Text>
					<Text className="text-muted-foreground text-xs" numberOfLines={1}>
						{partiesLine(sale)}
					</Text>
				</View>
			</View>
			<FigurePair>
				<Figure
					label="Vendido"
					value={formatMoney(sale.revenue)}
					note={plural(sale.productCount, "produto", "produtos")}
					struck={canceled}
				/>
				<Figure
					label="Lucro real"
					value={formatMoney(sale.profit)}
					note={
						sale.margin === null
							? "sem margem"
							: `margem ${formatRatio(sale.margin)}`
					}
					danger={loss && !canceled}
					good={!loss && !canceled && sale.profit > 0}
					struck={canceled}
				/>
			</FigurePair>
			<CanceledNote sale={sale} />
		</View>
	);
}

function SaleItemRow({ item }: { item: SaleItem }) {
	return (
		<ItemRow
			href={`/products/${item.productId}`}
			label={`${item.productName}, ${times(item.quantity)}`}
			leading={<ProductThumb uri={item.photoUri} name={item.productName} />}
			title={item.productName}
			subtitle={`${times(item.quantity)} ${formatMoney(item.unitPrice)}`}
			value={formatMoney(item.total)}
		/>
	);
}

function Details({ sale }: { sale: SaleDetail }) {
	return (
		<ListCard title="Detalhes">
			<InfoRow label="Canal" value={SALE_CHANNELS[sale.channel]} />
			{sale.resellerName ? (
				<InfoRow label="Revendedora" value={sale.resellerName} />
			) : null}
			<InfoRow label="Cliente" value={sale.customerName} />
			<InfoRow
				label="Pagamento"
				value={`${PAYMENT_METHODS[sale.paymentMethod]} · ${PAYMENT_CONDITIONS[sale.paymentCondition]}`}
			/>
			<InfoRow label="Registrada por" value={sale.author} />
		</ListCard>
	);
}

/**
 * Sale details (vendas.md): what was sold and the real profit on top, the products, where the money went, the details
 * and the cancel action. A canceled sale stays readable, crossed out, with when and why.
 */
export function SaleScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const query = useSale(id);

	return (
		<ScreenQuery title="Venda" query={query}>
			{(sale) => (
				<ScreenLayout
					header={<ScreenHeader title={`Venda #${sale.number}`} />}
					contentClassName="gap-7"
				>
					<Summary sale={sale} />
					<ListCard title="Produtos">
						{sale.items.map((item) => (
							<SaleItemRow key={item.id} item={item} />
						))}
					</ListCard>
					<MoneySplit data={breakdownOf(sale)} />
					<Details sale={sale} />
					<CancelSale sale={sale} />
				</ScreenLayout>
			)}
		</ScreenQuery>
	);
}
