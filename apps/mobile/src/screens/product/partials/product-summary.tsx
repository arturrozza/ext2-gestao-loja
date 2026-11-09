import { useState } from "react";
import { Pressable, View } from "react-native";
import { Figure, FigurePair } from "@/components/figure-pair";
import { ProductThumb } from "@/components/product-thumb";
import { StatusPill } from "@/components/status-pill";
import { Text } from "@/components/ui/text";
import { hapticTap, withHaptic } from "@/lib/haptics";
import { times } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { stockStatus } from "@/lib/stock-status";
import type { Product } from "@/queries/products/products.types";
import { PhotoViewer } from "./photo-viewer";
import { StockActions } from "./stock-actions";

/** The product's thumb; with a photo, a tap opens it over the whole screen. */
function SummaryThumb({ product }: { product: Product }) {
	const [viewing, setViewing] = useState(false);
	const { photoUrl, name } = product;
	const thumb = <ProductThumb uri={photoUrl} name={name} size="lg" />;
	if (!photoUrl) return thumb;
	return (
		<>
			<Pressable
				onPress={withHaptic(hapticTap, () => setViewing(true))}
				accessibilityRole="imagebutton"
				accessibilityLabel={`Ver a foto de ${name}`}
			>
				{thumb}
			</Pressable>
			<PhotoViewer
				uri={photoUrl}
				label={`Foto de ${name}`}
				open={viewing}
				onClose={() => setViewing(false)}
			/>
		</>
	);
}

/** Archived, or the most urgent stock state. */
function SummaryStatus({ product }: { product: Product }) {
	if (product.archived) return <StatusPill label="Arquivado" />;
	const status = stockStatus(product.flags);
	return status ? <StatusPill label={status.label} tone={status.tone} /> : null;
}

/**
 * The top card, like the sale's: the product with its category, the price (with the average cost) and the stock (with
 * its value) side by side, and what changes the stock.
 */
export function ProductSummary({ product }: { product: Product }) {
	return (
		<View className="gap-5 rounded-2xl bg-background p-5">
			<View className="flex-row items-center gap-4">
				<SummaryThumb product={product} />
				<View className="flex-1 gap-1.5">
					<Text className="font-sans-semibold text-lg leading-snug">
						{product.name}
					</Text>
					<Text className="text-muted-foreground text-sm">
						{product.categoryName ?? "Sem categoria"}
					</Text>
					<SummaryStatus product={product} />
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
			<StockActions product={product} />
		</View>
	);
}
