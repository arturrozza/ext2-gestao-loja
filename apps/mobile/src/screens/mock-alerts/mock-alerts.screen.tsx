import { useState } from "react";
import { View } from "react-native";
import Animated, {
	FadeIn,
	FadeOut,
	LinearTransition,
} from "react-native-reanimated";
import { ALERT_META, AlertRow } from "@/components/alert-row";
import { ChoiceChips } from "@/components/choice-chips";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { Text } from "@/components/ui/text";
import { MOCK_ALERTS } from "@/lib/mock-erp-data";

const FILTERS = [
	{ value: "all", label: "Todos" },
	{ value: "stock", label: "Estoque" },
	{ value: "expiry", label: "Validade" },
	{ value: "margin", label: "Margem" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

const GROUP: Record<string, Filter> = {
	low: "stock",
	out: "stock",
	idle: "stock",
	expiring: "expiry",
	expired: "expiry",
	"negative-margin": "margin",
};

export function MockAlertsScreen() {
	const [filter, setFilter] = useState<Filter>("all");
	const alerts = MOCK_ALERTS.filter(
		(a) => filter === "all" || GROUP[a.type] === filter,
	);
	const critical = MOCK_ALERTS.filter(
		(a) => ALERT_META[a.type].tone === "danger",
	).length;

	return (
		<ScreenLayout header={<ScreenHeader title="Alertas" />}>
			<View className="gap-1 rounded-3xl bg-card p-5">
				<Text className="font-sans-semibold text-3xl">
					{MOCK_ALERTS.length} alertas
				</Text>
				<Text className="text-muted-foreground">
					{critical} críticos · resolva a condição e o alerta some sozinho
				</Text>
			</View>
			<ChoiceChips options={FILTERS} value={filter} onChange={setFilter} />
			<Animated.View layout={LinearTransition.duration(240)}>
				<View className="gap-3">
					{alerts.map((alert) => (
						<Animated.View
							key={alert.id}
							entering={FadeIn.duration(200)}
							exiting={FadeOut.duration(120)}
						>
							<AlertRow alert={alert} />
						</Animated.View>
					))}
				</View>
			</Animated.View>
		</ScreenLayout>
	);
}
