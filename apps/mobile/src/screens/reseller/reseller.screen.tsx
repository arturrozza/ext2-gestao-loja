import { router, useLocalSearchParams } from "expo-router";
import { PencilSimpleIcon } from "phosphor-react-native/src/icons/PencilSimple";
import { View } from "react-native";
import { ArchiveControl } from "@/components/archive-control";
import { Figure, FigurePair } from "@/components/figure-pair";
import { IconButton } from "@/components/icon-button";
import { InfoRow } from "@/components/info-row";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { ScreenQuery } from "@/components/screen-query";
import { UnderConstructionCard } from "@/components/under-construction";
import { plural } from "@/lib/labels";
import { formatPhone } from "@/lib/masks";
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
						note={plural(reseller.salesCount, "venda", "vendas")}
					/>
				</FigurePair>
			</View>
			<View className="border-border border-t">
				<InfoRow label="Telefone" value={formatPhone(reseller.phone)} />
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
		<ScreenLayout
			header={
				<ScreenHeader
					title={reseller.name}
					right={
						reseller.archived ? undefined : (
							<IconButton
								icon={PencilSimpleIcon}
								label="Editar revendedora"
								onPress={() => router.push(`/resellers/${reseller.id}/edit`)}
							/>
						)
					}
				/>
			}
			contentClassName="gap-7"
		>
			<Numbers reseller={reseller} />
			{/* Becomes the list of her sales (`PersonSales`) with the sales module (MUN-16). */}
			<UnderConstructionCard
				title="Vendas"
				description="As vendas dela no canal Revendedora e a comissão por período chegam com as vendas."
			/>
			<ArchiveControl
				noun="revendedora"
				archived={reseller.archived}
				archivedText="Revendedora arquivada: não entra em novas vendas, mas continua no histórico e nos relatórios. Para editar, reative."
				confirmText={`${reseller.name} sai das novas vendas. O histórico e os relatórios continuam com ela, e dá para reativar depois.`}
				mutation={archive}
			/>
		</ScreenLayout>
	);
}

/**
 * A reseller (revendedoras.md): her numbers, data and the archive control. Her sales and the commission by period come
 * with the sales module (MUN-16); until then that block is under construction. Archived ones aren't edited, only
 * reactivated.
 */
export function ResellerScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const query = useReseller(id);
	return (
		<ScreenQuery title="Revendedora" query={query}>
			{(reseller) => <ResellerPage reseller={reseller} />}
		</ScreenQuery>
	);
}
