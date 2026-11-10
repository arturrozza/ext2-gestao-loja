import { describe, expect, it } from "bun:test";
import { alertsTotal } from "./alerts.rules";

describe("alertsTotal", () => {
	it("adds every alert, a product in two of them counting twice", () => {
		expect(
			alertsTotal({ lowStock: 2, outOfStock: 1, nearExpiry: 0, expired: 1 }),
		).toBe(4);
	});
});
