/**
 * Money helpers. The API sends money as a decimal string ("92.50", never float, see docs/conventions.md); the app does
 * math in integer cents and only formats at the edge.
 */

/** Decimal string with two places, as the API sends it ("1234.56"). */
export type Money = string;

/** Percentage as a decimal string ("10", "12.5"). */
export type Percent = string;

const currency = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

const plain = new Intl.NumberFormat("pt-BR", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

const percentFormat = new Intl.NumberFormat("pt-BR", {
	maximumFractionDigits: 2,
});

/** Largest amount the database column holds: numeric(12, 2). */
const MAX_CENTS = 999_999_999_999;

/** Masked value for when the user hides money (eye toggle). */
export const HIDDEN_MONEY = "R$ ••••••";

export function toCents(value: Money): number {
	return Math.round(Number(value) * 100);
}

export function fromCents(cents: number): Money {
	return (cents / 100).toFixed(2);
}

/** "R$ 1.234,56". Uses a real minus sign for negatives. */
export function formatCents(cents: number): string {
	const text = currency.format(Math.abs(cents) / 100);
	return cents < 0 ? `−${text}` : text;
}

export function formatMoney(value: Money): string {
	return formatCents(toCents(value));
}

/** "+R$ 40,00" / "−R$ 184,00" for deltas. */
export function formatSignedCents(cents: number): string {
	if (cents === 0) return formatCents(0);
	return cents > 0 ? `+${formatCents(cents)}` : formatCents(cents);
}

/** Cents as the user types them in an input ("1234,5" → "1.234,50"), for prefilling money fields. */
export function centsToInput(cents: number): string {
	return plain.format(cents / 100);
}

/** Money as the user types it, for prefilling a field ("1234.5" → "1.234,50"). */
export function moneyToInput(value: Money): string {
	return centsToInput(toCents(value));
}

/**
 * Parses money typed in pt-BR ("1.234,56", "92,5", "92"). Returns cents, or `null` when empty or invalid.
 * Negative values are invalid: nothing in the app takes a negative amount.
 */
export function parseMoneyInput(text: string): number | null {
	const normalized = text.trim().replace(/^R\$\s*/, "");
	// Some decimal-pad keyboards only have "." ("92.50"): a dot followed by 1-2 digits is a decimal separator.
	const decimalDot = /^\d+\.\d{1,2}$/.test(normalized);
	const valid =
		decimalDot ||
		/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(normalized);
	if (!valid) return null;
	const decimal = decimalDot
		? normalized
		: normalized.replace(/\./g, "").replace(",", ".");
	const cents = Math.round(Number(decimal) * 100);
	return cents <= MAX_CENTS ? cents : null;
}

/** Parses a percentage typed in pt-BR ("10", "12,5"). Returns the number (12.5), or `null` when invalid. */
export function parsePercentInput(text: string): number | null {
	const normalized = text.trim().replace(/%$/, "").trim();
	if (!/^\d+([.,]\d{1,2})?$/.test(normalized)) return null;
	return Number(normalized.replace(",", "."));
}

export function percentToInput(value: Percent | number): string {
	return percentFormat.format(Number(value));
}

/** `value` percent of `cents`, rounded to the cent. */
export function percentOf(cents: number, percent: number): number {
	return Math.round((cents * percent) / 100);
}

/** "12,5%". `ratio` is a fraction (0.125). */
export function formatRatio(ratio: number): string {
	return `${percentFormat.format(ratio * 100)}%`;
}

/** "12,5%". `percent` is already a percentage (12.5). */
export function formatPercent(percent: Percent | number): string {
	return `${percentFormat.format(Number(percent))}%`;
}
