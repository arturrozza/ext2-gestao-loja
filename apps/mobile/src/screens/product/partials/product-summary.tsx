import { View } from "react-native";
import { Figure, FigurePair } from "@/components/figure-pair";
import { ProductThumb } from "@/components/product-thumb";
import { StatusPill } from "@/components/status-pill";
import { Text } from "@/components/ui/text";
import { formatMoney } from "@/lib/money";
import type { Product } from "@/queries/products/products.types";

/**
 * The top card, like the sale's: the product with its category, the price and the stock side by side. The stock shows
 * "—" until purchases exist (MUN-12).
 */
export function ProductSummary({ product }: { product: Product }) {
	return (
		<View className="gap-5 rounded-2xl bg-background p-5">
			<View className="flex-row items-center gap-4">
				<ProductThumb name={product.name} size="lg" />
				<View className="flex-1 gap-1.5">
					<Text className="font-sans-semibold text-lg leading-snug">
						{product.name}
					</Text>
					<Text className="text-muted-foreground text-sm">
						{product.categoryName ?? "Sem categoria"}
					</Text>
					{product.archived ? <StatusPill label="Arquivado" /> : null}
				</View>
			</View>
			<FigurePair>
				<Figure label="Preço de venda" value={formatMoney(product.basePrice)} />
				<Figure label="Em estoque" value="—" />
			</FigurePair>
		</View>
	);
}
