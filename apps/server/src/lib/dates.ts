/**
 * Calendar days and expiry months. Days travel as "YYYY-MM-DD" and expiries as "YYYY-MM" (docs/product/compras.md),
 * the way the app sends them. "Today" is the store's day, not the server's (UTC): a purchase entered at 22:00 in São
 * Paulo is still that day.
 */

/** The store's time zone. One store in the MVP; per store when there are more (docs/architecture.md). */
export const STORE_TIME_ZONE = "America/Sao_Paulo";

/** "YYYY-MM-DD". */
export type ISODate = string;

/** "YYYY-MM": the product counts as expired after the last day of that month. */
export type ExpiryMonth = string;

const dayFormat = new Intl.DateTimeFormat("en-CA", {
	timeZone: STORE_TIME_ZONE,
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

/** The store's calendar day at `now`. */
export function storeToday(now: Date = new Date()): ISODate {
	// en-CA formats as "YYYY-MM-DD".
	return dayFormat.format(now);
}

/** The month of a day ("2026-11-09" → "2026-11"); also reads back a stored expiry ("2027-03-01" → "2027-03"). */
export function monthOf(day: ISODate): ExpiryMonth {
	return day.slice(0, 7);
}

/** How an expiry month is stored: the first day of the month ("2027-03" → "2027-03-01"). */
export function expiryToDate(expiry: ExpiryMonth): ISODate {
	return `${expiry}-01`;
}

/** A "YYYY-MM-DD" that exists in the calendar ("2026-02-30" doesn't; "2028-02-29" does). */
export function isRealDay(day: ISODate): boolean {
	const date = new Date(`${day}T00:00:00Z`);
	return (
		!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === day
	);
}

/** The calendar day `days` after `day` (before, when negative): "2026-03-02" − 6 = "2026-02-24". */
export function addDays(day: ISODate, days: number): ISODate {
	const date = new Date(`${day}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

/** Earliest day a purchase or sale takes: anything before is a typo (and the year 0 the date format lets through). */
const EARLIEST_DAY = "2000-01-01";

/**
 * What's wrong with the day of a purchase or sale, which can be any real day from 2000 up to `today` (the store's
 * day): `invalid` (not a real day, or before 2000), `future`, or `null` when it's fine.
 */
export function dayProblem(
	day: ISODate,
	today: ISODate,
): "invalid" | "future" | null {
	if (!isRealDay(day) || day < EARLIEST_DAY) return "invalid";
	if (day > today) return "future";
	return null;
}
