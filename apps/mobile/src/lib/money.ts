/**
 * Money and percentages as integers, like the API and the database (docs/conventions.md, "Dados"): money in cents
 * (R$ 92,50 = 9250) and percentages in basis points (12,5% = 1250, 100% = 10000). Math stays in integers; text only
 * at the edge (formatting and typed input), and typed input is parsed digit by digit, never through a float.
 */

/** Integer cents, as the API sends it (R$ 92,50 = 9250). */
export type Money = number;

/** Integer basis points, as the API sends it (12,5% = 1250, 100% = 10000). */
export type Percent = number;

/** Largest amount the API takes: what an `integer` column holds (R$ 21.474.836,47). */
export const MAX_CENTS = 2_147_483_647;

export const FULL_PERCENT = 10_000;

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

/** Masked value for when the user hides money (eye toggle). */
export const HIDDEN_MONEY = "R$ ••••••";

/** "R$ 1.234,56". Uses a real minus sign for negatives. */
export function formatMoney(cents: Money): string {
	const text = currency.format(Math.abs(cents) / 100);
	return cents < 0 ? `−${text}` : text;
}

/** "+R$ 40,00" / "−R$ 184,00" for deltas. */
export function formatSignedMoney(cents: Money): string {
	if (cents === 0) return formatMoney(0);
	return cents > 0 ? `+${formatMoney(cents)}` : formatMoney(cents);
}

/** Cents as the user types them in an input (123450 → "1.234,50"), for prefilling money fields. */
export function moneyToInput(cents: Money): string {
	return plain.format(cents / 100);
}

/** Whole units and up to two decimal digits, as text, in hundredths (cents or basis points): "92", "5" → 9205. */
function hundredths(units: string, decimals: string): number {
	return Number(units) * 100 + Number(decimals.padEnd(2, "0"));
}

/**
 * Parses money typed in pt-BR ("1.234,56", "92,5", "92"). Returns cents, or `null` when empty, invalid or over
 * `MAX_CENTS`. Negative values are invalid: nothing in the app takes a negative amount.
 */
export function parseMoneyInput(text: string): number | null {
	const normalized = text.trim().replace(/^R\$\s*/, "");
	// Some decimal-pad keyboards only have "." ("92.50"): a dot followed by 1-2 digits is a decimal separator.
	const decimalDot = /^(\d+)\.(\d{1,2})$/.exec(normalized);
	const comma = /^(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?$/.exec(normalized);
	const match = decimalDot ?? comma;
	if (!match) return null;
	const units = (match[1] ?? "").replace(/\./g, "").replace(/^0+(?=\d)/, "");
	// More digits than R$ 21 milhões has: over the limit (and past what a Number holds exactly).
	if (units.length > 8) return null;
	const cents = hundredths(units, match[2] ?? "");
	return cents <= MAX_CENTS ? cents : null;
}

/**
 * Parses a percentage typed in pt-BR ("10", "12,5", "12.5%"). Returns basis points (1250), or `null` when invalid or
 * over 100%.
 */
export function parsePercentInput(text: string): number | null {
	const normalized = text.trim().replace(/%$/, "").trim();
	const match = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(normalized);
	if (!match) return null;
	const basisPoints = hundredths(match[1] ?? "", match[2] ?? "");
	return basisPoints <= FULL_PERCENT ? basisPoints : null;
}

/** Basis points as the user types them (1250 → "12,5"), for prefilling percentage fields. */
export function percentToInput(basisPoints: Percent): string {
	return percentFormat.format(basisPoints / 100);
}

/**
 * `numerator ÷ denominator` (integers, denominator above zero) rounded to the nearest integer, halves away from zero.
 * Same rule as the server's `divideRounded` (apps/server/src/lib/money.ts), so a preview here matches what the API
 * saves; `money.parity.test.ts` in the server suite checks both side by side.
 */
export function divideRounded(numerator: number, denominator: number): number {
	// Same refusals as the server: a float or unsafe integer would silently give a fractional "cent".
	if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
		throw new RangeError(
			`divideRounded takes safe integers, got ${numerator} / ${denominator}`,
		);
	}
	if (denominator <= 0) {
		throw new RangeError(`denominator must be positive, got ${denominator}`);
	}
	const remainder = numerator % denominator;
	const quotient = (numerator - remainder) / denominator;
	if (Math.abs(remainder) * 2 < denominator) return quotient;
	return numerator < 0 ? quotient - 1 : quotient + 1;
}

/** `basisPoints` of `cents`, rounded to the cent (10% of R$ 0,05 = R$ 0,01). */
export function percentOf(cents: Money, basisPoints: Percent): Money {
	// Checked apart: a fraction times a whole number can still come out whole (92,5 × 1000).
	if (!Number.isSafeInteger(cents) || !Number.isSafeInteger(basisPoints)) {
		throw new RangeError(
			`percentOf takes safe integers, got ${cents} and ${basisPoints}`,
		);
	}
	return divideRounded(cents * basisPoints, FULL_PERCENT);
}

/** "12,5%". `ratio` is a fraction (0.125). */
export function formatRatio(ratio: number): string {
	return `${percentFormat.format(ratio * 100)}%`;
}

/** "12,5%". `basisPoints` is a percentage in basis points (1250). */
export function formatPercent(basisPoints: Percent): string {
	return `${percentFormat.format(basisPoints / 100)}%`;
}
