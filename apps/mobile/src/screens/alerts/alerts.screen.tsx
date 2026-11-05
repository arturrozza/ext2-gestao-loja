import { CheckCircleIcon } from "phosphor-react-native/src/icons/CheckCircle";
import { useState } from "react";
import {
	ActiveFilters,
	FilterControl,
	multiFilterGroup,
} from "@/components/filters";
import { EmptyState } from "@/components/query-states";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { useInfiniteList } from "@/components/use-infinite-list";
import type { AlertGroup } from "@/queries/alerts/alerts.types";
import { useAlerts } from "@/queries/alerts/use-alerts";
import { AlertRow, alertSection } from "./partials/alert-row";

const GROUPS: { value: AlertGroup; label: string }[] = [
	{ value: "stock", label: "Estoque" },
	{ value: "expiry", label: "Validade" },
	{ value: "margin", label: "Margem" },
	{ value: "stale", label: "Parados" },
];

/**
 * Active alerts (alertas.md), by kind, most urgent first; each leads to the right action. They're computed from the data and
 * vanish when the problem is solved, so there's nothing to dismiss.
 */
export function AlertsScreen() {
	const [groups, setGroups] = useState<AlertGroup[]>([]);
	const query = useAlerts({ groups });
	const list = useInfiniteList(
		query,
		<EmptyState
			icon={CheckCircleIcon}
			title={groups.length === 0 ? "Tudo certo" : "Nenhum alerta aqui"}
			description="Os alertas aparecem sozinhos quando algo precisar de atenção."
		/>,
	);

	const counts = query.data?.pages[0]?.counts;
	const filters = [
		multiFilterGroup({
			key: "group",
			title: "Tipo",
			options: GROUPS,
			values: groups,
			onChange: setGroups,
		}),
	];

	return (
		<ScreenLayout
			header={
				<ScreenHeader
					title="Alertas"
					right={<FilterControl variant="icon" groups={filters} />}
				/>
			}
			list={{
				...list,
				keyExtractor: (alert) => alert.id,
				sectionOf: (alert) => {
					const count = counts?.[alert.kind];
					return `${alertSection(alert.kind)}${count ? ` (${count})` : ""}`;
				},
				renderItem: (alert) => <AlertRow alert={alert} />,
			}}
		>
			<ActiveFilters groups={filters} />
		</ScreenLayout>
	);
}
