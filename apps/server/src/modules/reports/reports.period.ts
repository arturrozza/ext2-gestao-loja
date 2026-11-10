import {
	addDays,
	dayProblem,
	daysBetween,
	type ISODate,
	monthStart,
} from "../../lib/dates";
import { httpError } from "../../lib/http-error";
import type { ReportsModel } from "./reports.model";

/** The longest custom period, in days: 5 years. */
export const MAX_RANGE_DAYS = 5 * 366;

/** Both days included. */
export type Range = { from: ISODate; to: ISODate };

export type EvolutionUnit = ReportsModel["report"]["evolutionUnit"];

/** A period of up to 31 days gets a bar per day, up to ~6 months one per 7 days, and beyond that one per month. */
const MAX_DAYS_PER_DAY_BAR = 31;
const MAX_DAYS_PER_WEEK_BAR = 183;

const invalid = (field: string, message: string) =>
	httpError(422, { code: "validation", message, field });

function assertDay(field: "from" | "to", day: ISODate, today: ISODate): void {
	const problem = dayProblem(day, today);
	if (problem === "future") {
		throw invalid(field, "A data não pode ser no futuro.");
	}
	if (problem) throw invalid(field, "Confira a data.");
}

/** The days a custom period was asked for: both given, real, not in the future, in order and within 5 years. */
function customRange(
	{ from, to }: ReportsModel["query"],
	today: ISODate,
): Range {
	if (!from) throw invalid("from", "Informe a data inicial.");
	if (!to) throw invalid("to", "Informe a data final.");
	assertDay("from", from, today);
	assertDay("to", to, today);
	if (from > to) throw invalid("from", "A data inicial vem depois da final.");
	if (daysBetween(from, to) >= MAX_RANGE_DAYS) {
		throw invalid("to", "Escolha um período de até 5 anos.");
	}
	return { from, to };
}

/** The first and last day of the period on `today` (the store's day); `from` and `to` only matter to `custom`. */
export function resolvePeriod(
	query: ReportsModel["query"],
	today: ISODate,
): Range {
	switch (query.period ?? "month") {
		case "today":
			return { from: today, to: today };
		case "7d":
			return { from: addDays(today, -6), to: today };
		case "month":
			return { from: monthStart(today), to: today };
		case "last_month": {
			const to = addDays(monthStart(today), -1);
			return { from: monthStart(to), to };
		}
		case "custom":
			return customRange(query, today);
	}
}

export function evolutionUnitOf({ from, to }: Range): EvolutionUnit {
	const days = daysBetween(from, to) + 1;
	if (days <= MAX_DAYS_PER_DAY_BAR) return "day";
	return days <= MAX_DAYS_PER_WEEK_BAR ? "week" : "month";
}

/** The first day of the bar a day falls in. */
export function bucketStart(
	day: ISODate,
	unit: EvolutionUnit,
	range: Range,
): ISODate {
	if (unit === "day") return day;
	if (unit === "month") return monthStart(day);
	const weeks = Math.floor(daysBetween(range.from, day) / 7);
	return addDays(range.from, weeks * 7);
}

/** The first day of every bar from the period's start to its end, so a day without sales is a bar at zero. */
export function bucketStarts(unit: EvolutionUnit, range: Range): ISODate[] {
	const starts: ISODate[] = [];
	let start = bucketStart(range.from, unit, range);
	while (start <= range.to) {
		starts.push(start);
		start = nextBucket(start, unit);
	}
	return starts;
}

function nextBucket(start: ISODate, unit: EvolutionUnit): ISODate {
	if (unit === "day") return addDays(start, 1);
	if (unit === "week") return addDays(start, 7);
	// The 1st plus 31 days is always inside the next month.
	return monthStart(addDays(start, 31));
}
