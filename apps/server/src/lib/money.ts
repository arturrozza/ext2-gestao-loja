/**
 * Money and percentages as integers (docs/conventions.md, "Dados"). Money is in cents (R$ 92,50 = 9250) and
 * percentages in basis points (12,5% = 1250, 100% = 10000), in the database, the API and the app. Every division that
 * can leave a fraction of a cent goes through `divideRounded`, so the whole server rounds the same way.
 */

/** Largest value of an `integer` column: R$ 21.474.836,47 in cents. */
export const MAX_CENTS = 2_147_483_647;

/** 100% in basis points. */
export const FULL_PERCENT = 10_000;

function assertInteger(name: string, value: number): void {
	if (!Number.isSafeInteger(value)) {
		throw new RangeError(`${name} must be a safe integer, got ${value}`);
	}
}

/**
 * `numerator ÷ denominator` rounded to the nearest integer, halves away from zero (2,5 → 3 and −2,5 → −3, like
 * Postgres `round`). Exact: it works on the integer quotient and remainder, never on a float result.
 */
export function divideRounded(numerator: number, denominator: number): number {
	assertInteger("numerator", numerator);
	assertInteger("denominator", denominator);
	if (denominator <= 0) {
		throw new RangeError(`denominator must be positive, got ${denominator}`);
	}
	const remainder = numerator % denominator;
	const quotient = (numerator - remainder) / denominator;
	if (Math.abs(remainder) * 2 < denominator) return quotient;
	return numerator < 0 ? quotient - 1 : quotient + 1;
}

/** `basisPoints` of `cents`, rounded to the cent (10% of R$ 0,05 = R$ 0,01). */
export function percentOf(cents: number, basisPoints: number): number {
	assertInteger("cents", cents);
	assertInteger("basisPoints", basisPoints);
	return divideRounded(cents * basisPoints, FULL_PERCENT);
}
