import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { ADJUSTMENT_REASONS, signed } from "@/lib/labels";
import { formatSignedCents, toCents } from "@/lib/money";
import type {
	AdjustmentReason,
	ProductDetail,
} from "@/queries/products/products.types";

/**
 * The effect before confirming (estoque.md): "10 → 8 (−2) · −R$ 184 em estoque. Motivo: perda." Units come in or go
 * out at the current average cost, which doesn't change.
 */
export function AdjustPreview({
	product,
	newQuantity,
	reason,
}: {
	product: ProductDetail;
	newQuantity: number | null;
	reason: AdjustmentReason | undefined;
}) {
	if (newQuantity === null || newQuantity === product.stock) return null;
	const delta = newQuantity - product.stock;
	const value = delta * toCents(product.averageCost);

	return (
		<View className="gap-1 rounded-2xl bg-background p-4">
			<Text className="text-muted-foreground text-xs">Como fica</Text>
			<Text className="font-sans-semibold text-base">
				{product.stock} → {newQuantity} ({signed(delta)}) ·{" "}
				{formatSignedCents(value)} em estoque
			</Text>
			{reason ? (
				<Text className="text-muted-foreground text-sm">
					Motivo: {ADJUSTMENT_REASONS[reason].toLowerCase()}.
				</Text>
			) : null}
		</View>
	);
}
