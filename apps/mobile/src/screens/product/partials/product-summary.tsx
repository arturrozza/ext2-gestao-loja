import { View } from "react-native";
import { Figure, FigurePair } from "@/components/figure-pair";
import { ProductThumb } from "@/components/product-thumb";
import { StockFlagPills } from "@/components/stock-flag-pills";
import { Text } from "@/components/ui/text";
import { times, units } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import type { ProductDetail } from "@/queries/products/products.types";
import { StockActions } from "./stock-card";

/**
 * The top card, like the sale's: the product with its photo and category, the price and the stock side by side, and the
 * actions that change the stock.
 */
export function ProductSummary({ product }: { product: ProductDetail }) {
	const expiredUnits = product.stock - product.sellableStock;
	return (
		<View className="gap-5 rounded-2xl bg-background p-5">
			<View className="flex-row items-center gap-4">
				<ProductThumb uri={product.photoUri} name={product.name} size="lg" />
				<View className="flex-1 gap-1.5">
					<Text className="font-sans-semibold text-lg leading-snug">
						{product.name}
					</Text>
					<Text className="text-muted-foreground text-sm">
						{product.categoryName ?? "Sem categoria"}
					</Text>
					<StockFlagPills flags={product.flags} archived={product.archived} />
				</View>
			</View>
			<FigurePair>
				<Figure
					label="Preço de venda"
					value={formatMoney(product.basePrice)}
					note={`custo médio ${formatMoney(product.averageCost)}`}
				/>
				<Figure
					label="Em estoque"
					value={times(product.stock)}
					note={`vale ${formatMoney(product.stockValue)}`}
					danger={product.stock === 0}
				/>
			</FigurePair>
			{expiredUnits > 0 ? (
				<Text className="rounded-[8px] bg-destructive/10 px-4 py-3 text-destructive text-sm">
					{units(expiredUnits)} vencidas: não entram na venda até serem
					descartadas.
				</Text>
			) : null}
			<StockActions product={product} />
		</View>
	);
}
