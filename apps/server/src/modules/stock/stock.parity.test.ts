import { describe, expect, it } from "bun:test";
// The app has no test runner yet (docs/testing.md); its stock math is plain TypeScript, so it's tested here: the
// adjustment preview has to show the value the API records.
import * as app from "../../../../mobile/src/lib/stock-math";
import { MAX_LINE_UNITS } from "../../lib/fields";
import { planAdjustment } from "./stock.adjustment";
import type { OpenLot, StockBalance } from "./stock.rules";

/** What the API records for an adjustment of `delta` units, or `null` when it refuses it. */
function serverValueChange(balance: StockBalance, delta: number) {
	const lots: OpenLot[] = [
		{ id: "lot", expiry: null, quantity: balance.quantity, expired: false },
	];
	try {
		return planAdjustment(balance, lots, false, {
			newQuantity: balance.quantity + delta,
			reason: delta > 0 ? "count" : "loss",
			note: null,
		}).movement.valueChange;
	} catch {
		return null;
	}
}

describe("app and server adjustment value", () => {
	it("share the most units one adjustment adds", () => {
		expect(app.MAX_ADJUST_UNITS).toBe(MAX_LINE_UNITS);
	});

	it("move the same value for every change", () => {
		const balances: StockBalance[] = [
			{ quantity: 10, value: 92_000 },
			{ quantity: 3, value: 1000 },
			{ quantity: 3, value: 2000 },
			{ quantity: 4, value: 2 },
			{ quantity: 7, value: 0 },
			{ quantity: 1, value: 2_000_000_000 },
		];
		const deltas = [1, 2, 3, 6, 100, MAX_LINE_UNITS, MAX_LINE_UNITS + 1];
		for (const balance of balances) {
			const downs = Array.from(
				{ length: balance.quantity },
				(_, i) => -(i + 1),
			);
			for (const delta of [...deltas, ...downs]) {
				expect(app.adjustmentValueChange(balance, delta)).toBe(
					serverValueChange(balance, delta),
				);
			}
		}
	});

	it("show nothing without stock, where the API refuses new units", () => {
		const empty = { quantity: 0, value: 0 };

		expect(app.adjustmentValueChange(empty, 2)).toBeNull();
		expect(serverValueChange(empty, 2)).toBeNull();
	});
});
