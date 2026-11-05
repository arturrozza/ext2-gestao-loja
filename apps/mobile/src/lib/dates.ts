/**
 * Date helpers. The API stores timestamps in UTC (ISO strings); the app shows them in local time (America/Sao_Paulo).
 * Calendar days travel as "YYYY-MM-DD" and expiry dates as month + year, "YYYY-MM" (docs/product/compras.md).
 */

/** Calendar day, "YYYY-MM-DD". */
export type ISODate = string;

/** Expiry month, "YYYY-MM". A product counts as expired after the last day of that month. */
export type ExpiryMonth = string;

const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (value: number) => String(value).padStart(2, "0");

const MONTHS = [
	"janeiro",
	"fevereiro",
	"março",
	"abril",
	"maio",
	"junho",
	"julho",
	"agosto",
	"setembro",
	"outubro",
	"novembro",
	"dezembro",
] as const;

export function toISODate(date: Date): ISODate {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISODate(): ISODate {
	return toISODate(new Date());
}

/** Local midnight of a calendar day. */
export function fromISODate(value: ISODate): Date {
	const [year, month, day] = value.split("-").map(Number);
	return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function addDays(value: ISODate, days: number): ISODate {
	const date = fromISODate(value);
	date.setDate(date.getDate() + days);
	return toISODate(date);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: ISODate, to: ISODate): number {
	return Math.round(
		(fromISODate(to).getTime() - fromISODate(from).getTime()) / DAY_MS,
	);
}

/** "04/11/2026". */
export function formatDate(value: ISODate): string {
	const [year, month, day] = value.split("-");
	return `${day}/${month}/${year}`;
}

/** "Hoje", "Ontem" or "04/11/2026". */
export function formatRelativeDate(value: ISODate): string {
	const diff = daysBetween(value, todayISODate());
	if (diff === 0) return "Hoje";
	if (diff === 1) return "Ontem";
	return formatDate(value);
}

/** Local "04/11/2026 às 14:32" for an ISO timestamp. */
export function formatDateTime(iso: string): string {
	const date = new Date(iso);
	return `${formatDate(toISODate(date))} às ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const WEEKDAYS = [
	"Domingo",
	"Segunda-feira",
	"Terça-feira",
	"Quarta-feira",
	"Quinta-feira",
	"Sexta-feira",
	"Sábado",
] as const;

/**
 * Heading of a day in a list, the way people say it: "Hoje", "Ontem", the weekday within the last week, then
 * "2 de novembro" ("2 de novembro de 2025" in another year).
 */
export function formatDayHeading(
	value: ISODate,
	today = todayISODate(),
): string {
	const diff = daysBetween(value, today);
	if (diff === 0) return "Hoje";
	if (diff === 1) return "Ontem";
	const date = fromISODate(value);
	if (diff > 1 && diff < 7) return WEEKDAYS[date.getDay()] ?? formatDate(value);
	const day = `${date.getDate()} de ${MONTHS[date.getMonth()]}`;
	return value.slice(0, 4) === today.slice(0, 4)
		? day
		: `${day} de ${date.getFullYear()}`;
}

/** "Hoje às 14:32", "Segunda-feira às 09:10", "2 de novembro às 18:00": when something happened, in local time. */
export function formatMoment(iso: string): string {
	const date = new Date(iso);
	return `${formatDayHeading(toISODate(date))} às ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function monthName(monthIndex: number): string {
	return MONTHS[monthIndex] ?? "";
}

/** "08/2027". */
export function formatExpiry(value: ExpiryMonth): string {
	const [year, month] = value.split("-");
	return `${month}/${year}`;
}

/** Last day of the expiry month ("2027-08" → "2027-08-31"). */
export function expiryLastDay(value: ExpiryMonth): ISODate {
	const [year, month] = value.split("-").map(Number);
	return toISODate(new Date(year ?? 1970, month ?? 1, 0));
}

/** Expired: today is after the last day of the expiry month. */
export function isExpired(value: ExpiryMonth, today = todayISODate()): boolean {
	return daysBetween(expiryLastDay(value), today) > 0;
}

/** Days left until the last day of the expiry month (0 on that day, negative once expired). */
export function daysUntilExpiry(
	value: ExpiryMonth,
	today = todayISODate(),
): number {
	return daysBetween(today, expiryLastDay(value));
}

/** "04/11/2026" → "2026-11-04", or `null` when it isn't a real date. */
export function parseDateInput(text: string): ISODate | null {
	const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
	if (!match) return null;
	const [, day, month, year] = match;
	const iso = `${year}-${month}-${day}`;
	return toISODate(fromISODate(iso)) === iso ? iso : null;
}

/** "08/2027" → "2027-08", or `null` when invalid. */
export function parseExpiryInput(text: string): ExpiryMonth | null {
	const match = /^(\d{2})\/(\d{4})$/.exec(text);
	if (!match) return null;
	const [, month, year] = match;
	const monthNumber = Number(month);
	if (monthNumber < 1 || monthNumber > 12) return null;
	return `${year}-${month}`;
}
