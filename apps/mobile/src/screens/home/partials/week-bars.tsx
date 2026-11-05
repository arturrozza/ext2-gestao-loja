import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { fromISODate } from "@/lib/dates";
import { formatMoney, toCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { HomeSummary } from "@/queries/home/home.types";

const BAR_MAX = 40;
const EMPTY_BAR = 4;
const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const WEEKDAY_NAMES = [
	"domingo",
	"segunda",
	"terça",
	"quarta",
	"quinta",
	"sexta",
	"sábado",
];

const weekdayOf = (date: string) => fromISODate(date).getDay();

function barColor(today: boolean, empty: boolean) {
	if (empty) return "bg-border";
	return today ? "bg-primary" : "bg-primary/20";
}

function Bar({
	height,
	today,
	empty,
}: {
	height: number;
	today: boolean;
	empty: boolean;
}) {
	return (
		<View
			className={cn("flex-1 rounded-t-md rounded-b-sm", barColor(today, empty))}
			style={{ height }}
		/>
	);
}

function describe(week: HomeSummary["week"], empty: boolean, hidden: boolean) {
	if (empty) return "Nenhuma venda nos últimos 7 dias";
	if (hidden) return "Vendas dos últimos 7 dias, valores escondidos";
	const days = week.map(
		(day) =>
			`${WEEKDAY_NAMES[weekdayOf(day.date)]} ${formatMoney(day.revenue)}`,
	);
	return `Vendas dos últimos 7 dias: ${days.join(", ")}`;
}

/**
 * Tiny bar chart of the last 7 days of sales: one hue (orange), today solid, the other days light. Bars grow from a
 * shared baseline with rounded tops; no axis, the day initials sit under each bar. Without sales, every bar is a flat
 * gray stub. `hidden`: values are masked, so the screen reader doesn't speak them either.
 */
export function WeekBars({
	week,
	hidden,
}: {
	week: HomeSummary["week"];
	hidden: boolean;
}) {
	const values = week.map((day) => toCents(day.revenue));
	const max = Math.max(...values, 0);
	const empty = max === 0;
	const heightOf = (cents: number) =>
		empty ? EMPTY_BAR : Math.max(EMPTY_BAR, (cents / max) * BAR_MAX);
	const isToday = (index: number) => index === week.length - 1;

	return (
		<View
			className="gap-2"
			accessible
			accessibilityLabel={describe(week, empty, hidden)}
		>
			<View className="flex-row items-end gap-1.5" style={{ height: BAR_MAX }}>
				{week.map((day, index) => (
					<Bar
						key={day.date}
						height={heightOf(values[index] ?? 0)}
						today={isToday(index)}
						empty={empty}
					/>
				))}
			</View>
			<View className="flex-row gap-1.5">
				{week.map((day, index) => (
					<Text
						key={day.date}
						className={cn(
							"flex-1 text-center text-[10px]",
							isToday(index)
								? "font-sans-semibold text-foreground"
								: "text-muted-foreground",
						)}
					>
						{isToday(index) ? "Hoje" : WEEKDAYS[weekdayOf(day.date)]}
					</Text>
				))}
			</View>
		</View>
	);
}
