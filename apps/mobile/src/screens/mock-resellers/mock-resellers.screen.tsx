import { Plus } from "lucide-react-native";
import { View } from "react-native";
import { IconButton } from "@/components/icon-button";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { SectionTitle } from "@/components/section-title";
import { Text } from "@/components/ui/text";
import { formatBRL, MOCK_RESELLERS } from "@/lib/mock-erp-data";
import { ResellerRow } from "./partials/reseller-row";

export function MockResellersScreen() {
	const totalPending = MOCK_RESELLERS.reduce(
		(sum, r) => sum + r.pendingSettlement,
		0,
	);
	const pendingCount = MOCK_RESELLERS.filter(
		(r) => r.pendingSettlement > 0,
	).length;
	const commissions = MOCK_RESELLERS.reduce(
		(sum, r) => sum + r.monthSales * r.commissionRate,
		0,
	);

	return (
		<ScreenLayout
			header={
				<ScreenHeader
					title="Revendedoras"
					right={
						<IconButton
							icon={Plus}
							label="Nova revendedora"
							variant="primary"
						/>
					}
				/>
			}
		>
			<View className="gap-4 rounded-3xl bg-secondary p-5">
				<View className="gap-1">
					<Text className="text-secondary-foreground/60 text-sm">
						Acertos em aberto
					</Text>
					<Text className="font-sans-semibold text-4xl text-secondary-foreground">
						{formatBRL(totalPending)}
					</Text>
					<Text className="text-secondary-foreground/60 text-sm">
						{pendingCount} de {MOCK_RESELLERS.length} revendedoras
					</Text>
				</View>
				<View className="rounded-2xl bg-secondary-foreground/10 p-3">
					<Text className="text-secondary-foreground/60 text-xs">
						Comissões do mês (custo no lucro real)
					</Text>
					<Text className="font-sans-semibold text-secondary-foreground">
						{formatBRL(commissions)}
					</Text>
				</View>
			</View>
			<View className="gap-3">
				<SectionTitle title="Este mês" />
				{MOCK_RESELLERS.map((r) => (
					<ResellerRow key={r.id} reseller={r} />
				))}
			</View>
		</ScreenLayout>
	);
}
