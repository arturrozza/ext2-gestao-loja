import { describe, expect, it } from "bun:test";
import { expiryToDate, isRealDay, monthOf, storeToday } from "./dates";

describe("storeToday", () => {
	it("is the day in São Paulo, not in UTC", () => {
		// 01:30 UTC on the 10th is still 22:30 on the 9th in São Paulo (UTC−3).
		expect(storeToday(new Date("2026-11-10T01:30:00Z"))).toBe("2026-11-09");
		expect(storeToday(new Date("2026-11-10T03:00:00Z"))).toBe("2026-11-10");
	});
});

describe("expiry months", () => {
	it("takes the month of a day", () => {
		expect(monthOf("2026-11-09")).toBe("2026-11");
	});

	it("stores an expiry as the first day of its month and reads it back", () => {
		expect(expiryToDate("2027-03")).toBe("2027-03-01");
		expect(monthOf("2027-03-01")).toBe("2027-03");
	});
});

describe("isRealDay", () => {
	it("takes days that exist, leap days included", () => {
		expect(isRealDay("2026-11-09")).toBe(true);
		expect(isRealDay("2028-02-29")).toBe(true);
	});

	it("refuses days that don't exist", () => {
		for (const day of [
			"2026-02-30",
			"2027-02-29",
			"2026-13-01",
			"2026-00-10",
		]) {
			expect(isRealDay(day)).toBe(false);
		}
	});
});
