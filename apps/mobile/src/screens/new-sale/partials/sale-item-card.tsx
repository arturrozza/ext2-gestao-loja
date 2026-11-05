import { router } from "expo-router";
import { TrashIcon } from "phosphor-react-native/src/icons/Trash";
import { Pressable, View } from "react-native";
import { FormField } from "@/components/form-field";
import { ProductThumb } from "@/components/product-thumb";
import { QuantityStepper } from "@/components/quantity-stepper";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticTap, withHaptic } from "@/lib/haptics";
import { formatMoney, parseMoneyInput } from "@/lib/money";
import type { ProductDetail } from "@/queries/products/products.types";
import { type SaleItemDraft, shortage } from "../new-sale.schema";

/**
 * "Estoque insuficiente: disponível 2. [Lançar compra] [Ajustar estoque]" (vendas.md). Both shortcuts push on top of
 * the sale, so coming back finds it filled in; the available number refreshes by itself.
 */
function InsufficientStock({
	productId,
	available,
	missing,
}: {
	productId: string;
	available: number;
	missing: number;
}) {
	return (
		<View className="gap-2 rounded-[8px] bg-destructive/10 p-3">
			<Text className="font-sans-medium text-destructive text-sm">
				Estoque insuficiente: disponível {available}.
			</Text>
			<View className="flex-row gap-2">
				<Button
					size="sm"
					variant="outline"
					className="flex-1 bg-field-raised"
					onPress={() =>
						router.push({
							pathname: "/purchases/new",
							params: { productId, quantity: String(missing) },
						})
					}
				>
					<Text className="text-sm">Lançar compra</Text>
				</Button>
				<Button
					size="sm"
					variant="outline"
					className="flex-1 bg-field-raised"
					onPress={() => router.push(`/products/${productId}/adjust`)}
				>
					<Text className="text-sm">Ajustar estoque</Text>
				</Button>
			</View>
		</View>
	);
}

/** One sale line: quantity, price (base price by default, editable only for this sale) and the live stock check. */
export function SaleItemCard({
	item,
	product,
	errors,
	onChange,
	onRemove,
}: {
	item: SaleItemDraft;
	/** Live data; `undefined` while it loads. */
	product: ProductDetail | undefined;
	errors: { quantity?: string; unitPrice?: string };
	onChange: (patch: Partial<SaleItemDraft>) => void;
	onRemove: () => void;
}) {
	const price = parseMoneyInput(item.unitPrice);
	const available = product?.sellableStock;
	const missing = shortage(item, product);

	return (
		<View className="gap-4 border-border border-b pb-5">
			<View className="flex-row items-center gap-3">
				<ProductThumb uri={item.product.photoUri} name={item.product.name} />
				<View className="flex-1 gap-0.5">
					<Text className="font-sans-semibold text-sm" numberOfLines={2}>
						{item.product.name}
					</Text>
					<Text className="text-muted-foreground text-xs">
						{available === undefined
							? "Conferindo o estoque..."
							: `${available} disponíveis`}
					</Text>
				</View>
				<Pressable
					onPress={withHaptic(hapticTap, onRemove)}
					accessibilityRole="button"
					accessibilityLabel={`Remover ${item.product.name}`}
					hitSlop={8}
					className="p-1"
				>
					<Icon as={TrashIcon} size={18} className="text-destructive" />
				</Pressable>
			</View>
			<View className="flex-row items-start gap-3">
				<View className="gap-2">
					<Text className="px-1 font-sans-medium text-sm">Quantidade</Text>
					<QuantityStepper
						value={item.quantity}
						onChange={(quantity) => onChange({ quantity })}
						invalid={missing > 0 || Boolean(errors.quantity)}
					/>
				</View>
				<View className="flex-1">
					<FormField
						label="Preço (R$)"
						value={item.unitPrice}
						onChangeText={(unitPrice) => onChange({ unitPrice })}
						error={errors.unitPrice}
						keyboardType="decimal-pad"
						placeholder="0,00"
					/>
				</View>
			</View>
			{errors.quantity ? (
				<Text className="px-1 text-destructive text-sm">{errors.quantity}</Text>
			) : null}
			{missing > 0 && product ? (
				<InsufficientStock
					productId={product.id}
					available={product.sellableStock}
					missing={missing}
				/>
			) : null}
			{item.quantity > 1 ? (
				<View className="flex-row justify-between px-1">
					<Text className="text-muted-foreground text-sm">Total do item</Text>
					<Text className="font-sans-semibold text-sm">
						{price === null ? "—" : formatMoney(price * item.quantity)}
					</Text>
				</View>
			) : null}
		</View>
	);
}
