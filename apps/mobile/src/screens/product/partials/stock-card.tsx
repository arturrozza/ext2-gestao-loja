import { router } from "expo-router";
import { View } from "react-native";
import { InfoRow } from "@/components/info-row";
import { ListCard } from "@/components/list-card";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import type { ProductDetail } from "@/queries/products/products.types";

/** What changes the stock: a purchase (the main way), an adjustment, a cost correction. */
export function StockActions({ product }: { product: ProductDetail }) {
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
			<View className="flex-row gap-2">
				<Button
					variant="outline"
					className="flex-1 px-2"
					onPress={() => router.push(`/products/${product.id}/adjust`)}
				>
					<Text>Ajustar estoque</Text>
				</Button>
				{product.stock > 0 ? (
					<Button
						variant="outline"
						className="flex-1 px-2"
						onPress={() => router.push(`/products/${product.id}/cost`)}
					>
						<Text>Corrigir custo</Text>
					</Button>
				) : null}
			</View>
		</View>
	);
}

/** Where the product is kept and when it counts as low. Quantity, value and cost are in the top card. */
export function StockCard({ product }: { product: ProductDetail }) {
	return (
		<ListCard title="Estoque">
			<InfoRow
				label="Estoque mínimo"
				value={product.minStock === null ? null : String(product.minStock)}
			/>
			<InfoRow label="Localização" value={product.location} />
		</ListCard>
	);
}
