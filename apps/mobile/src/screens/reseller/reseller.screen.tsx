import { router, useLocalSearchParams } from "expo-router";
import { NoteIcon } from "phosphor-react-native/src/icons/Note";
import { PencilSimpleIcon } from "phosphor-react-native/src/icons/PencilSimple";
import { PhoneIcon } from "phosphor-react-native/src/icons/Phone";
import { useState } from "react";
import { View } from "react-native";
import { ArchiveControl } from "@/components/archive-control";
import { ChoiceChips } from "@/components/choice-chips";
import { Figure, FigurePair } from "@/components/figure-pair";
import { IconButton } from "@/components/icon-button";
import { InfoRow } from "@/components/info-row";
import { PersonSales } from "@/components/person-sales";
import { ScreenQuery } from "@/components/screen-query";
import { plural, SALE_PERIODS, toOptions } from "@/lib/labels";
import { formatPhone } from "@/lib/masks";
import { formatMoney, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Reseller } from "@/queries/resellers/resellers.types";
import {
	useReseller,
	useSetResellerArchived,
} from "@/queries/resellers/use-resellers";
import type { SalePeriod } from "@/queries/sales/sales.types";

/** Her numbers; `stale` while those of the period just picked load (the previous ones stay, dimmed). */
function Numbers({ reseller, stale }: { reseller: Reseller; stale: boolean }) {
	return (
		<View className="overflow-hidden rounded-2xl bg-background">
			<View className={cn("p-5", stale && "opacity-40")}>
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
				<InfoRow
					label="Telefone"
					icon={PhoneIcon}
					value={formatPhone(reseller.phone)}
				/>
				{reseller.note ? (
					<InfoRow label="Observação" icon={NoteIcon} value={reseller.note} />
				) : null}
			</View>
		</View>
	);
}

const PERIODS = toOptions(SALE_PERIODS);

function ResellerPage({
	reseller,
	stale,
	period,
	onPeriod,
}: {
	reseller: Reseller;
	stale: boolean;
	period: SalePeriod;
	onPeriod: (period: SalePeriod) => void;
}) {
	const archive = useSetResellerArchived(reseller.id);
	return (
		<PersonSales
			title={reseller.name}
			headerRight={
				reseller.archived ? undefined : (
					<IconButton
						icon={PencilSimpleIcon}
						label="Editar revendedora"
						onPress={() => router.push(`/resellers/${reseller.id}/edit`)}
					/>
				)
			}
			filter={{ resellerId: reseller.id }}
			period={period}
			emptyDescription="As vendas dela no canal Revendedora, no período escolhido, aparecem aqui."
			bottom={
				<ArchiveControl
					noun="revendedora"
					archived={reseller.archived}
					archivedText="Revendedora arquivada: não entra em novas vendas, mas continua no histórico e nos relatórios. Para editar, reative."
					confirmText={`${reseller.name} sai das novas vendas. O histórico e os relatórios continuam com ela, e dá para reativar depois.`}
					mutation={archive}
				/>
			}
		>
			{/* The period of the numbers and of the sales under them: "Mês" to settle the month with her. */}
			<ChoiceChips
				options={PERIODS}
				value={period}
				onChange={onPeriod}
				surface="page"
			/>
			<Numbers reseller={reseller} stale={stale} />
		</PersonSales>
	);
}

/**
 * A reseller (revendedoras.md): her sales and commission in a period (this month by default), her data, her sales and
 * the archive control. Archived ones aren't edited, only reactivated.
 */
export function ResellerScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const [period, setPeriod] = useState<SalePeriod>("month");
	const query = useReseller(id, period);
	return (
		<ScreenQuery title="Revendedora" query={query}>
			{(reseller) => (
				<ResellerPage
					reseller={reseller}
					stale={query.isPlaceholderData}
					period={period}
					onPeriod={setPeriod}
				/>
			)}
		</ScreenQuery>
	);
}
