import { describe, expect, it } from "bun:test";
import {
	addDays,
	dayProblem,
	expiryToDate,
	isRealDay,
	monthOf,
	storeToday,
} from "./dates";

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

describe("dayProblem", () => {
	const today = "2026-11-09";

	it("takes today and any real day from 2000 on", () => {
		expect(dayProblem(today, today)).toBe(null);
		expect(dayProblem("2000-01-01", today)).toBe(null);
	});

	it("refuses a day that doesn't exist or comes before 2000", () => {
		expect(dayProblem("2026-02-30", today)).toBe("invalid");
		expect(dayProblem("1999-12-31", today)).toBe("invalid");
		expect(dayProblem("0000-01-01", today)).toBe("invalid");
	});

	it("refuses a day after today", () => {
		expect(dayProblem("2026-11-10", today)).toBe("future");
	});
});

describe("addDays", () => {
	it("moves across months, years and leap days", () => {
		expect(addDays("2026-03-02", -6)).toBe("2026-02-24");
		expect(addDays("2026-12-28", 6)).toBe("2027-01-03");
		expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
	});
});
