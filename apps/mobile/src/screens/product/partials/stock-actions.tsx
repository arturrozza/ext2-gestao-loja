import { router } from "expo-router";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { UnderConstructionTag } from "@/components/under-construction";
import type { Product } from "@/queries/products/products.types";

/**
 * What changes the stock: a purchase (the main way), an adjustment, a cost correction. Adjusting and correcting come
 * with the stock screen (MUN-13): tagged until then.
 */
export function StockActions({ product }: { product: Product }) {
	return (
		<View className="gap-2">
			{product.archived ? null : (
				<Button
					onPress={() =>
						router.push({
							pathname: "/purchases/new",
							params: { productId: product.id },
						})
					}
				>
					<Text>Lançar compra</Text>
				</Button>
			)}
			{/* Stacked, not side by side: with the tag, half a row wraps on narrow phones. */}
			<Button
				variant="outline"
				onPress={() => router.push(`/products/${product.id}/adjust`)}
			>
				<Text>Ajustar estoque</Text>
				<UnderConstructionTag />
			</Button>
			{product.stock > 0 ? (
				<Button
					variant="outline"
					onPress={() => router.push(`/products/${product.id}/cost`)}
				>
					<Text>Corrigir custo</Text>
					<UnderConstructionTag />
				</Button>
			) : null}
		</View>
	);
}
