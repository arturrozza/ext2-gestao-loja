import { Link } from "expo-router";
import { CaretRightIcon } from "phosphor-react-native/src/icons/CaretRight";
import { EyeIcon } from "phosphor-react-native/src/icons/Eye";
import { EyeSlashIcon } from "phosphor-react-native/src/icons/EyeSlash";
import { TrendDownIcon } from "phosphor-react-native/src/icons/TrendDown";
import { TrendUpIcon } from "phosphor-react-native/src/icons/TrendUp";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticSelect, hapticTap, withHaptic } from "@/lib/haptics";
import {
	formatMoney,
	formatRatio,
	HIDDEN_MONEY,
	type Money,
} from "@/lib/money";
import { cn } from "@/lib/utils";
import type { HomeSummary } from "@/queries/home/home.types";
import { WeekBars } from "./week-bars";

/** Profit change vs. last month, or a hint when there's nothing to compare yet. */
function Trend({ month }: { month: HomeSummary["month"] }) {
	if (month.salesCount === 0) {
		return (
			<Text className="text-muted-foreground text-xs">
				Nenhuma venda este mês ainda
			</Text>
		);
	}
	if (month.profitChange === null) return null;
	const down = month.profitChange < 0;
	const percent = formatRatio(Math.abs(month.profitChange));
	return (
		<View className="flex-row items-center gap-1.5">
			<Icon
				as={down ? TrendDownIcon : TrendUpIcon}
				size={14}
				className={down ? "text-destructive" : "text-primary"}
			/>
			<Text
				className={cn(
					"font-sans-semibold text-xs",
					down ? "text-destructive" : "text-primary",
				)}
			>
				{down ? "−" : "+"}
				{percent}
			</Text>
			<Text className="text-muted-foreground text-xs">
				vs. mesmo período de {month.previousName}
			</Text>
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
 * Back on the home with the month summary (MUN-18).
 *
 * White highlight card: the month's real profit (the app's core number; tapping it opens the report) and the numbers
 * behind it. The eye hides money values for when a customer can see the screen.
 */
export function ProfitHighlight({ summary }: { summary: HomeSummary }) {
	const [hidden, setHidden] = useState(false);
	const { month, week } = summary;
	const money = (value: Money) => (hidden ? HIDDEN_MONEY : formatMoney(value));
	const profitLoss = month.profit < 0;

	return (
		<View className="gap-5 rounded-2xl bg-background p-5">
			<View className="gap-1.5">
				<View className="flex-row items-center justify-between">
					<Text className="font-sans-medium text-muted-foreground text-sm">
						Lucro real · {month.name}
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
				<Link href="/reports" asChild>
					<Pressable
						onPress={hapticTap}
						accessibilityRole="button"
						accessibilityLabel="Ver relatório do mês"
						className="flex-row items-center justify-between"
					>
						<Text
							className={cn(
								"font-sans-semibold text-[32px] leading-tight tracking-tight",
								profitLoss && !hidden && "text-destructive",
							)}
						>
							{money(month.profit)}
						</Text>
						<Icon
							as={CaretRightIcon}
							size={20}
							className="text-foreground/45"
						/>
					</Pressable>
				</Link>
				<Trend month={month} />
			</View>

			<WeekBars week={week} hidden={hidden} />

			<View className="flex-row gap-4 border-border border-t pt-5">
				<Stat label="Faturamento" value={money(month.revenue)} />
				<Stat
					label="Margem"
					value={month.margin === null ? "—" : formatRatio(month.margin)}
				/>
				<Stat label="Vendas" value={String(month.salesCount)} />
			</View>
		</View>
	);
}
