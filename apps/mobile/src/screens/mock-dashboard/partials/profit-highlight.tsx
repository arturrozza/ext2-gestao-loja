import { Link } from "expo-router";
import { CaretRightIcon } from "phosphor-react-native/src/icons/CaretRight";
import { EyeIcon } from "phosphor-react-native/src/icons/Eye";
import { EyeSlashIcon } from "phosphor-react-native/src/icons/EyeSlash";
import { TrendUpIcon } from "phosphor-react-native/src/icons/TrendUp";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticSelect, hapticTap, withHaptic } from "@/lib/haptics";
import { formatBRL, formatPercent, MOCK_REPORT } from "@/lib/mock-erp-data";
import { WeekBars } from "./week-bars";

const HIDDEN = "R$ ••••••";

type Summary = {
	profit: number;
	revenue: number;
	/** `null` while there are no sales (no margin to compute). */
	margin: number | null;
	salesCount: number;
};

const MONTH: Summary = {
	profit: MOCK_REPORT.profit,
	revenue: MOCK_REPORT.revenue,
	margin: MOCK_REPORT.profit / MOCK_REPORT.revenue,
	salesCount: MOCK_REPORT.salesCount,
};
const EMPTY: Summary = { profit: 0, revenue: 0, margin: null, salesCount: 0 };

/** Change vs. last month, or a hint when the month has no sales yet. */
function Trend({ empty }: { empty: boolean }) {
	if (empty) {
		return (
			<Text className="text-muted-foreground text-xs">
				Nenhuma venda este mês ainda
			</Text>
		);
	}
	return (
		<View className="flex-row items-center gap-1.5">
			<Icon as={TrendUpIcon} size={14} className="text-primary" />
			<Text className="font-sans-semibold text-primary text-xs">+12%</Text>
			<Text className="text-muted-foreground text-xs">vs. outubro</Text>
		</View>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<View className="flex-1 gap-1">
			<Text className="text-muted-foreground text-xs">{label}</Text>
			<Text
				className="font-sans-semibold text-base"
				numberOfLines={1}
				adjustsFontSizeToFit
			>
				{value}
			</Text>
		</View>
	);
}

/**
 * White highlight card: the month's real profit (the app's core number; tapping it opens the report), the numbers
 * behind it. The eye hides money values for when a customer can see the screen. `empty`: the store just started, so
 * everything is zero and the week chart is flat.
 */
export function ProfitHighlight({ empty = false }: { empty?: boolean }) {
	const [hidden, setHidden] = useState(false);
	const summary = empty ? EMPTY : MONTH;
	const money = (value: number) => (hidden ? HIDDEN : formatBRL(value));

	return (
		<View className="gap-5 rounded-2xl bg-background p-5">
			<View className="gap-1.5">
				<View className="flex-row items-center justify-between">
					<Text className="font-sans-medium text-muted-foreground text-sm">
						Lucro real · novembro
					</Text>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={hidden ? "Mostrar valores" : "Esconder valores"}
						hitSlop={12}
						onPress={withHaptic(hapticSelect, () =>
							setHidden((value) => !value),
						)}
					>
						<Icon
							as={hidden ? EyeSlashIcon : EyeIcon}
							size={18}
							className="text-foreground/45"
						/>
					</Pressable>
				</View>
				<Link href="/mock/reports" asChild>
					<Pressable
						onPress={hapticTap}
						accessibilityRole="button"
						accessibilityLabel="Ver relatório do mês"
						className="flex-row items-center justify-between"
					>
						<Text className="font-sans-semibold text-[32px] leading-tight tracking-tight">
							{money(summary.profit)}
						</Text>
						<Icon
							as={CaretRightIcon}
							size={20}
							className="text-foreground/45"
						/>
					</Pressable>
				</Link>
				<Trend empty={empty} />
			</View>

			<WeekBars empty={empty} />

			<View className="flex-row gap-4 border-border border-t pt-5">
				<Stat label="Faturamento" value={money(summary.revenue)} />
				<Stat
					label="Margem"
					value={summary.margin === null ? "—" : formatPercent(summary.margin)}
				/>
				<Stat label="Vendas" value={String(summary.salesCount)} />
			</View>
		</View>
	);
}
