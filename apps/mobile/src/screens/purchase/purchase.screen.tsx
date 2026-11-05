import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Figure, FigurePair } from "@/components/figure-pair";
import { ItemRow } from "@/components/item-row";
import { ListCard } from "@/components/list-card";
import { ProductThumb } from "@/components/product-thumb";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { ScreenQuery } from "@/components/screen-query";
import { ThumbStack } from "@/components/thumb-stack";
import { Text } from "@/components/ui/text";
import { formatDayHeading, formatExpiry, formatMoment } from "@/lib/dates";
import { plural, times } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import type { PurchaseDetail } from "@/queries/purchases/purchases.types";
import { usePurchase } from "@/queries/purchases/use-purchases";
import { CancelPurchase } from "./partials/cancel-purchase";

function itemLine(item: PurchaseDetail["items"][number]) {
	const parts = [`${times(item.quantity)} ${formatMoney(item.unitCost)}`];
	if (item.expiry) parts.push(`validade ${formatExpiry(item.expiry)}`);
	return parts.join(" · ");
}

function Summary({ purchase }: { purchase: PurchaseDetail }) {
	const canceled = purchase.status === "canceled";
	return (
		<View className="gap-5 rounded-2xl bg-background p-5">
			<View className="flex-row items-center gap-3.5">
				<View className={canceled ? "opacity-40" : undefined}>
					<ThumbStack
						items={purchase.preview}
						total={purchase.productCount}
						fit
					/>
				</View>
				<View className="flex-1 gap-1">
					<Text className="font-sans-semibold text-[15px]" numberOfLines={1}>
						{formatDayHeading(purchase.date)}
					</Text>
					<Text className="text-muted-foreground text-xs" numberOfLines={1}>
						Lançada por {purchase.author},{" "}
						{formatMoment(purchase.createdAt).toLowerCase()}
					</Text>
				</View>
			</View>
			<FigurePair>
				<Figure
					label="Total"
					value={formatMoney(purchase.total)}
					note={plural(purchase.productCount, "produto", "produtos")}
					struck={canceled}
				/>
				<Figure
					label="Unidades"
					value={times(purchase.unitCount)}
					note="entraram no estoque"
					struck={canceled}
				/>
			</FigurePair>
			{purchase.canceledAt ? (
				<Text className="rounded-[8px] bg-destructive/10 px-4 py-3 text-destructive text-sm">
					Cancelada {formatMoment(purchase.canceledAt).toLowerCase()}. As
					unidades saíram do estoque.
				</Text>
			) : null}
			{purchase.note ? (
				<Text className="text-muted-foreground text-sm">“{purchase.note}”</Text>
			) : null}
		</View>
	);
}

/** Purchase details (compras.md): items with cost and expiry, who entered it, and the cancel action. */
export function PurchaseScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const query = usePurchase(id);

	return (
		<ScreenQuery title="Compra" query={query}>
			{(purchase) => (
				<ScreenLayout
					header={<ScreenHeader title={`Compra #${purchase.number}`} />}
					contentClassName="gap-7"
				>
					<Summary purchase={purchase} />
					<ListCard title="Produtos">
						{purchase.items.map((item) => (
							<ItemRow
								key={item.id}
								href={`/products/${item.productId}`}
								label={`${item.productName}, ${times(item.quantity)}`}
								leading={
									<ProductThumb uri={item.photoUri} name={item.productName} />
								}
								title={item.productName}
								subtitle={itemLine(item)}
								value={formatMoney(item.total)}
							/>
						))}
					</ListCard>
					<CancelPurchase purchase={purchase} />
				</ScreenLayout>
			)}
		</ScreenQuery>
	);
}
