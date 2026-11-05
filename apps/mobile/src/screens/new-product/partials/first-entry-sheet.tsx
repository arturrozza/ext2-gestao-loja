import { router } from "expo-router";
import { View } from "react-native";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

/**
 * After a new product is saved (produtos.md): offer "Cadastrar primeira entrada" with the product already picked.
 * Skipping opens the product. Either way the form leaves the stack.
 */
export function FirstEntrySheet({
	product,
}: {
	product: { id: string; name: string } | null;
}) {
	const open = (target: "purchase" | "product") => {
		if (!product) return;
		if (target === "purchase") {
			router.replace({
				pathname: "/purchases/new",
				params: { productId: product.id },
			});
			return;
		}
		router.replace(`/products/${product.id}`);
	};

	return (
		<BottomSheet
			open={product !== null}
			onClose={() => open("product")}
			title="Produto cadastrado"
		>
			<View className="gap-3 px-3 pt-1">
				<Text className="text-muted-foreground text-sm">
					{product?.name} está com estoque zero. Lance a compra para dar entrada
					na mercadoria e calcular o custo.
				</Text>
				<Button onPress={() => open("purchase")}>
					<Text>Cadastrar primeira entrada</Text>
				</Button>
				<Button variant="outline" onPress={() => open("product")}>
					<Text>Agora não</Text>
				</Button>
			</View>
		</BottomSheet>
	);
}
