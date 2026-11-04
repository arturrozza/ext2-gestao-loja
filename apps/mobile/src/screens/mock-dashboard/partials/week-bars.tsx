import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { MOCK_REPORT } from "@/lib/mock-erp-data";
import { cn } from "@/lib/utils";

const BAR_MAX = 40;
const days = MOCK_REPORT.daily;
const max = Math.max(...days.map((d) => d.revenue));
const isToday = (index: number) => index === days.length - 1;

const EMPTY_BAR = 4;

function barColor(today: boolean, empty: boolean) {
	if (empty) return "bg-border";
	return today ? "bg-primary" : "bg-primary/20";
}

function Bar({
	revenue,
	today,
	empty,
}: {
	revenue: number;
	today: boolean;
	empty: boolean;
}) {
	const height = empty
		? EMPTY_BAR
		: Math.max(EMPTY_BAR, (revenue / max) * BAR_MAX);
	return (
		<View
			className={cn("flex-1 rounded-t-md rounded-b-sm", barColor(today, empty))}
			style={{ height }}
		/>
	);
}

/**
 * Tiny bar chart of the last 7 days of sales: one hue (orange), today solid, the other days light. Bars grow from a
 * shared baseline with rounded tops; no axis, the day initials sit under each bar.
 * `empty`: no sales yet, so every bar is a flat gray stub.
 */
export function WeekBars({ empty = false }: { empty?: boolean }) {
	return (
		<View
			className="gap-2"
			accessible
			accessibilityLabel={
				empty
					? "Nenhuma venda nos últimos 7 dias"
					: `Vendas dos últimos 7 dias: ${days
							.map((d) => `${d.day} ${Math.round(d.revenue)} reais`)
							.join(", ")}`
			}
		>
			<View className="flex-row items-end gap-1.5" style={{ height: BAR_MAX }}>
				{days.map((d, index) => (
					<Bar
						key={d.day}
						revenue={d.revenue}
						today={isToday(index)}
						empty={empty}
					/>
				))}
			</View>
			<View className="flex-row gap-1.5">
				{days.map((d, index) => (
					<Text
						key={d.day}
						className={cn(
							"flex-1 text-center text-[10px]",
							isToday(index)
								? "font-sans-semibold text-foreground"
								: "text-muted-foreground",
						)}
					>
						{isToday(index) ? "Hoje" : d.day}
					</Text>
				))}
			</View>
		</View>
	);
}
