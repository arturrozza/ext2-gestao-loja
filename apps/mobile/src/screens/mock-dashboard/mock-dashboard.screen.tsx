import { View } from "react-native";
import { AlertRow } from "@/components/alert-row";
import { SaleCard } from "@/components/sale-card";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { SectionTitle } from "@/components/section-title";
import { MOCK_ALERTS, MOCK_SALES } from "@/lib/mock-erp-data";
import { ProfitHighlight } from "./partials/profit-highlight";
import { QuickStats } from "./partials/quick-stats";

export function MockDashboardScreen() {
	return (
		<ScreenLayout
			bottom="tabs"
			header={
				<ScreenHeader
					variant="large"
					title={"Bom dia!\nVeja como está a loja"}
				/>
			}
		>
			<View className="gap-3">
				<ProfitHighlight />
				<QuickStats />
			</View>

			<View className="gap-3">
				<SectionTitle
					title="Precisa de atenção"
					action={`${MOCK_ALERTS.length} alertas`}
					href="/mock/alerts"
				/>
				{MOCK_ALERTS.slice(0, 3).map((alert) => (
					<AlertRow key={alert.id} alert={alert} />
				))}
			</View>

			<View className="gap-3">
				<SectionTitle
					title="Últimas vendas"
					action="Ver todas"
					href="/mock/sales"
				/>
				{MOCK_SALES.slice(0, 3).map((sale) => (
					<SaleCard key={sale.id} sale={sale} />
				))}
			</View>
		</ScreenLayout>
	);
}
