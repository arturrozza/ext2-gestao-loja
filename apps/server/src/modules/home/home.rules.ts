import { addDays, type ISODate, monthStart } from "../../lib/dates";
import { type DayTotals, marginOf } from "../sales/sales.rules";

/** A day "YYYY-MM-DD" → its day of the month. */
const dayOfMonth = (day: ISODate) => Number(day.slice(8));

/**
 * The same days of last month as this month so far: the 1st up to today's day, or up to last month's end when it's
 * shorter (on March 31st, all of February).
 */
export function previousMonthSoFar(today: ISODate): {
	start: ISODate;
	end: ISODate;
} {
	const lastMonthEnd = addDays(monthStart(today), -1);
	const start = monthStart(lastMonthEnd);
	const days = Math.min(dayOfMonth(today), dayOfMonth(lastMonthEnd));
	return { start, end: addDays(start, days - 1) };
}

/**
 * Profit vs. the same days of last month, as a ratio of last month's (−0,25 is 25% less). `null` when last month made
 * no profit to compare with: a change from zero or from a loss reads wrong as a percentage.
 */
export function profitChange(current: number, previous: number): number | null {
	if (previous <= 0) return null;
	return (current - previous) / previous;
}

function totalsOf(days: DayTotals[]) {
	return days.reduce(
		(sum, day) => ({
			revenue: sum.revenue + day.revenue,
			profit: sum.profit + day.profit,
			salesCount: sum.salesCount + day.salesCount,
		}),
		{ revenue: 0, profit: 0, salesCount: 0 },
	);
}

const between = (days: DayTotals[], start: ISODate, end: ISODate) =>
	days.filter((day) => day.date >= start && day.date <= end);

/**
 * The home's month summary and week bars (docs/product/inicio.md), from the daily totals since last month's 1st
 * (always before the week's start):
 * this month so far, compared with the same days of last month, and the revenue of today and the 6 days before.
 */
export function summarize(days: DayTotals[], today: ISODate) {
	const start = monthStart(today);
	const previous = previousMonthSoFar(today);
	const month = totalsOf(between(days, start, today));
	const before = totalsOf(between(days, previous.start, previous.end));
	const byDay = new Map(days.map((day) => [day.date, day.revenue]));
	// Today and the 6 days before, like the sales list's "7 days" (vendas.md).
	const weekStart = addDays(today, -6);
	return {
		month: {
			start,
			revenue: month.revenue,
			profit: month.profit,
			salesCount: month.salesCount,
			margin: marginOf(month.profit, month.revenue),
			profitChange: profitChange(month.profit, before.profit),
		},
		week: Array.from({ length: 7 }, (_, index) => {
			const date = addDays(weekStart, index);
			return { date, revenue: byDay.get(date) ?? 0 };
		}),
	};
}
