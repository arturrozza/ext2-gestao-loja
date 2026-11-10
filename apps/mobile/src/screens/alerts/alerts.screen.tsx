import { View } from "react-native";
import { QueryView } from "@/components/query-states";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { RowsSkeleton } from "@/components/skeleton";
import { useAlerts } from "@/queries/alerts/use-alerts";
import { ALERTS, AlertCard } from "./partials/alert-card";

/**
 * Alerts (alertas.md): how many products are in each one, computed from the data, so they vanish when the problem is
 * solved and there's nothing to dismiss. Each card opens the product list with that filter.
 */
export function AlertsScreen() {
	const query = useAlerts();
	return (
		<ScreenLayout
			header={<ScreenHeader title="Alertas" />}
			onRefresh={query.refetch}
		>
			<QueryView query={query} skeleton={<RowsSkeleton rows={4} />}>
				{(counts) => (
					<View className="gap-2.5">
						{ALERTS.map((alert) => (
							<AlertCard
								key={alert.filter}
								alert={alert}
								count={counts[alert.count]}
							/>
						))}
					</View>
				)}
			</QueryView>
		</ScreenLayout>
	);
}
