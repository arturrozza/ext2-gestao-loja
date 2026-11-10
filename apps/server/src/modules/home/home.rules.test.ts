import { describe, expect, it } from "bun:test";
import { previousMonthSoFar, profitChange, summarize } from "./home.rules";

describe("previousMonthSoFar", () => {
	it("is the 1st to today's day of last month", () => {
		expect(previousMonthSoFar("2026-11-09")).toEqual({
			start: "2026-10-01",
			end: "2026-10-09",
		});
	});

	it("stops at last month's end when it's shorter", () => {
		expect(previousMonthSoFar("2026-03-31")).toEqual({
			start: "2026-02-01",
			end: "2026-02-28",
		});
	});

	it("goes back across the year", () => {
		expect(previousMonthSoFar("2027-01-15")).toEqual({
			start: "2026-12-01",
			end: "2026-12-15",
		});
	});
});

describe("profitChange", () => {
	it("is the change as a ratio of last month's profit", () => {
		expect(profitChange(15_000, 10_000)).toBe(0.5);
		expect(profitChange(7500, 10_000)).toBe(-0.25);
	});

	it("is null without a profit last month", () => {
		expect(profitChange(10_000, 0)).toBeNull();
		expect(profitChange(10_000, -500)).toBeNull();
	});
});

describe("summarize", () => {
	const day = (
		date: string,
		revenue: number,
		profit: number,
		salesCount = 1,
	) => ({
		date,
		revenue,
		profit,
		salesCount,
	});

	it("sums this month, compares with the same days of last month and fills the week", () => {
		const summary = summarize(
			[
				day("2026-10-02", 10_000, 4000),
				// After today's day of last month: out of the comparison.
				day("2026-10-20", 99_000, 99_000),
				// In the week, but last month.
				day("2026-10-31", 5000, 1000),
				day("2026-11-01", 20_000, 5000, 2),
				day("2026-11-03", 10_000, 1000),
			],
			"2026-11-03",
		);

		expect(summary.month).toEqual({
			start: "2026-11-01",
			revenue: 30_000,
			profit: 6000,
			salesCount: 3,
			margin: 0.2,
			profitChange: 0.5,
		});
		expect(summary.week).toEqual([
			{ date: "2026-10-28", revenue: 0 },
			{ date: "2026-10-29", revenue: 0 },
			{ date: "2026-10-30", revenue: 0 },
			{ date: "2026-10-31", revenue: 5000 },
			{ date: "2026-11-01", revenue: 20_000 },
			{ date: "2026-11-02", revenue: 0 },
			{ date: "2026-11-03", revenue: 10_000 },
		]);
	});

	it("starts empty, with nothing to compare", () => {
		expect(summarize([], "2026-11-03").month).toEqual({
			start: "2026-11-01",
			revenue: 0,
			profit: 0,
			salesCount: 0,
			margin: null,
			profitChange: null,
		});
	});
});
