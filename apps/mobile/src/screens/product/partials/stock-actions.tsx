import { router } from "expo-router";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import type { Product } from "@/queries/products/products.types";

/**
 * What changes the stock: a purchase (the main way), an adjustment, a cost correction. Adjusting and correcting need
 * units in stock: without them there's nothing to fix, and new units come in by a purchase (estoque.md).
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
			{product.stock > 0 ? (
				<>
					<Button
						variant="outline"
						onPress={() => router.push(`/products/${product.id}/adjust`)}
					>
						<Text>Ajustar estoque</Text>
					</Button>
					<Button
						variant="outline"
						onPress={() => router.push(`/products/${product.id}/cost`)}
					>
						<Text>Corrigir custo</Text>
					</Button>
				</>
			) : null}
		</View>
	);
}
