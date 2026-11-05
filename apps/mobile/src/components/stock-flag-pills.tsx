import { View } from "react-native";
import { StatusPill } from "@/components/status-pill";
import type { StockFlags } from "@/queries/products/products.types";

/**
 * Pills for the stock problems of a product. "Sem estoque" replaces "Estoque baixo" (docs/product/alertas.md). Back
 * on the product screen with MUN-12/13.
 */
export function StockFlagPills({
	flags,
	archived = false,
}: {
	flags: StockFlags;
	archived?: boolean;
}) {
	const pills = [
		archived && { label: "Arquivado", tone: "neutral" as const },
		flags.outOfStock && { label: "Sem estoque", tone: "danger" as const },
		flags.lowStock && { label: "Estoque baixo", tone: "highlight" as const },
		flags.expired && { label: "Vencido", tone: "danger" as const },
		flags.nearExpiry && {
			label: "Perto de vencer",
			tone: "highlight" as const,
		},
	].filter((pill) => pill !== false);

	if (pills.length === 0) return null;
	return (
		<View className="flex-row flex-wrap gap-1.5">
			{pills.map((pill) => (
				<StatusPill key={pill.label} label={pill.label} tone={pill.tone} />
			))}
		</View>
	);
}
