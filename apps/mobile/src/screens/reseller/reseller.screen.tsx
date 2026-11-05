import { router, useLocalSearchParams } from "expo-router";
import { PencilSimpleIcon } from "phosphor-react-native/src/icons/PencilSimple";
import { View } from "react-native";
import { ArchiveControl } from "@/components/archive-control";
import { Figure, FigurePair } from "@/components/figure-pair";
import { IconButton } from "@/components/icon-button";
import { InfoRow } from "@/components/info-row";
import { PersonSales } from "@/components/person-sales";
import { ScreenQuery } from "@/components/screen-query";
import { formatMoney, formatPercent } from "@/lib/money";
import type { Reseller } from "@/queries/resellers/resellers.types";
import {
	useReseller,
	useSetResellerArchived,
} from "@/queries/resellers/use-resellers";

function Numbers({ reseller }: { reseller: Reseller }) {
	return (
		<View className="overflow-hidden rounded-2xl bg-background">
			<View className="p-5">
				<FigurePair>
					<Figure
						label="Comissão total"
						value={formatMoney(reseller.commissionTotal)}
						note={`padrão ${formatPercent(reseller.defaultCommission)}`}
					/>
					<Figure
						label="Vendido"
						value={formatMoney(reseller.salesTotal)}
						note={
							reseller.salesCount === 1
								? "1 venda"
								: `${reseller.salesCount} vendas`
						}
					/>
				</FigurePair>
			</View>
			<View className="border-border border-t">
				<InfoRow label="Telefone" value={reseller.phone} />
				{reseller.note ? (
					<InfoRow label="Observação" value={reseller.note} />
				) : null}
			</View>
		</View>
	);
}

function ResellerPage({ reseller }: { reseller: Reseller }) {
	const archive = useSetResellerArchived(reseller.id);
	return (
		<PersonSales
			title={reseller.name}
			filter={{ resellerId: reseller.id }}
			emptyDescription="As vendas no canal Revendedora com ela aparecem aqui."
			bottom={
				<ArchiveControl
					noun="revendedora"
					archived={reseller.archived}
					archivedText="Revendedora arquivada: não entra em novas vendas, mas continua no histórico e nos relatórios."
					confirmText={`${reseller.name} sai das novas vendas. O histórico e os relatórios continuam com ela, e dá para reativar depois.`}
					mutation={archive}
				/>
			}
			headerRight={
				<IconButton
					icon={PencilSimpleIcon}
					label="Editar revendedora"
					onPress={() => router.push(`/resellers/${reseller.id}/edit`)}
				/>
			}
		>
			<Numbers reseller={reseller} />
		</PersonSales>
	);
}

/** A reseller's numbers and sales (revendedoras.md). */
export function ResellerScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const query = useReseller(id);
	return (
		<ScreenQuery title="Revendedora" query={query}>
			{(reseller) => <ResellerPage reseller={reseller} />}
		</ScreenQuery>
	);
}
