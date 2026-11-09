// Plain TypeScript with relative imports only: the server suite tests it next to its own stock rules
// (apps/server/src/modules/stock/stock.parity.test.ts), like `money.ts`.
import { divideRounded, MAX_CENTS } from "./money";

/** Most units one adjustment adds (the server's `MAX_LINE_UNITS`). */
export const MAX_ADJUST_UNITS = 100_000;

/** A product's stock: units and their value in cents. */
export type StockBalance = { quantity: number; value: number };

/**
 * Value an adjustment of `delta` units moves, as the API records it (docs/decisions.md, MUN-13): units come in at the
 * exact average, which stays, and leave at the rounded average × units, never more than there is, all of it at zero.
 * `null` when the API would refuse the change for its size (no stock, too many units or past what the ledger holds).
 */
export function adjustmentValueChange(
	balance: StockBalance,
	delta: number,
): number | null {
	if (balance.quantity === 0 || delta > MAX_ADJUST_UNITS) return null;
	if (delta > 0) {
		const change = divideRounded(balance.value * delta, balance.quantity);
		return balance.value + change <= MAX_CENTS ? change : null;
	}
	const units = -delta;
	if (units >= balance.quantity) return -balance.value;
	const average = divideRounded(balance.value, balance.quantity);
	return -Math.min(average * units, balance.value);
}
