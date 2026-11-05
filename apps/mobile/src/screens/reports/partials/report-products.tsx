import { useState } from "react";
import { View } from "react-native";
import { ChoiceChips } from "@/components/choice-chips";
import { ListCard, ListRow } from "@/components/list-card";
import { Text } from "@/components/ui/text";
import { times } from "@/lib/labels";
import { formatMoney, formatRatio } from "@/lib/money";
import type { Report } from "@/queries/reports/reports.types";

type Ranking = keyof Report["products"];

const RANKINGS: { value: Ranking; label: string }[] = [
	{ value: "bestSellers", label: "Mais vendidos" },
	{ value: "worstSellers", label: "Menos vendidos" },
	{ value: "bestMargin", label: "Melhor margem" },
	{ value: "worstMargin", label: "Pior margem" },
];

function marginText(margin: number | null) {
	return margin === null ? "—" : formatRatio(margin);
}

/** Product rankings of the period, each highlighting what it ranks. Margins split a sale's costs by item value (provisional, relatorios.md). */
export function ReportProducts({ products }: { products: Report["products"] }) {
	const [ranking, setRanking] = useState<Ranking>("bestSellers");

	return (
		<View className="gap-3">
			<Text className="px-1 font-sans-semibold text-base">Produtos</Text>
			<ChoiceChips
				surface="page"
				options={RANKINGS}
				value={ranking}
				onChange={setRanking}
			/>
			<ListCard>
				{products[ranking].map((product) => {
					const byMargin =
						ranking === "bestMargin" || ranking === "worstMargin";
					return (
						<ListRow
							key={product.productId}
							title={product.name}
							subtitle={
								byMargin
									? `${times(product.quantity)} · ${formatMoney(product.revenue)}`
									: `${formatMoney(product.revenue)} · margem ${marginText(product.margin)}`
							}
							href={`/products/${product.productId}`}
							right={
								<Text className="font-sans-semibold text-sm">
									{byMargin
										? marginText(product.margin)
										: times(product.quantity)}
								</Text>
							}
						/>
					);
				})}
			</ListCard>
		</View>
	);
}
