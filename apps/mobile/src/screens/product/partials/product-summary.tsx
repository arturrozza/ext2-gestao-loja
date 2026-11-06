import { useState } from "react";
import { Pressable, View } from "react-native";
import { Figure, FigurePair } from "@/components/figure-pair";
import { ProductThumb } from "@/components/product-thumb";
import { StatusPill } from "@/components/status-pill";
import { Text } from "@/components/ui/text";
import { hapticTap, withHaptic } from "@/lib/haptics";
import { formatMoney } from "@/lib/money";
import type { Product } from "@/queries/products/products.types";
import { PhotoViewer } from "./photo-viewer";

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

/**
 * The top card, like the sale's: the product with its category, the price and the stock side by side. The stock shows
 * "—" until purchases exist (MUN-12).
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
