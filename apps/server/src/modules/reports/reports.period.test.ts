import { describe, expect, it } from "bun:test";
import { thrown } from "../../../test/support/thrown";
import { addDays } from "../../lib/dates";
import {
	bucketStart,
	bucketStarts,
	evolutionUnitOf,
	MAX_RANGE_DAYS,
	resolvePeriod,
} from "./reports.period";

const TODAY = "2026-11-09";

describe("resolvePeriod", () => {
	it("resolves the fixed periods on the store's day", () => {
		expect(resolvePeriod({ period: "today" }, TODAY)).toEqual({
			from: TODAY,
			to: TODAY,
		});
		// Today and the 6 days before, like the sales list.
		expect(resolvePeriod({ period: "7d" }, TODAY)).toEqual({
			from: "2026-11-03",
			to: TODAY,
		});
		expect(resolvePeriod({ period: "month" }, TODAY)).toEqual({
			from: "2026-11-01",
			to: TODAY,
		});
		expect(resolvePeriod({ period: "last_month" }, TODAY)).toEqual({
			from: "2026-10-01",
			to: "2026-10-31",
		});
	});

	it("is the current month when none is given", () => {
		expect(resolvePeriod({}, TODAY)).toEqual({ from: "2026-11-01", to: TODAY });
	});

	it("takes last month across the year and in a short February", () => {
		expect(resolvePeriod({ period: "last_month" }, "2027-01-15")).toEqual({
			from: "2026-12-01",
			to: "2026-12-31",
		});
		expect(resolvePeriod({ period: "last_month" }, "2026-03-31")).toEqual({
			from: "2026-02-01",
			to: "2026-02-28",
		});
	});

	it("takes a custom period as given, both days included", () => {
		expect(
			resolvePeriod(
				{ period: "custom", from: "2026-10-05", to: "2026-10-05" },
				TODAY,
			),
		).toEqual({ from: "2026-10-05", to: "2026-10-05" });
	});

	it("refuses a custom period without its days, in the future, backwards, unreal or too long", () => {
		const refused = (from?: string, to?: string) =>
			thrown(() => resolvePeriod({ period: "custom", from, to }, TODAY));

		expect(refused(undefined, TODAY)).toMatchObject({
			code: 422,
			response: { field: "from" },
		});
		expect(refused("2026-11-01", undefined)).toMatchObject({
			code: 422,
			response: { field: "to" },
		});
		expect(refused("2026-11-01", "2026-11-10")).toMatchObject({
			code: 422,
			response: { field: "to" },
		});
		expect(refused("2026-11-05", "2026-11-01")).toMatchObject({
			code: 422,
			response: { field: "from" },
		});
		expect(refused("2026-02-30", "2026-11-01")).toMatchObject({
			code: 422,
			response: { field: "from" },
		});
		expect(refused("2020-01-01", TODAY)).toMatchObject({
			code: 422,
			response: { field: "to" },
		});
	});

	it("takes the longest period and refuses one day more", () => {
		const to = "2026-11-09";
		const last = addDays(to, -(MAX_RANGE_DAYS - 1));
		expect(
			resolvePeriod({ period: "custom", from: last, to }, TODAY).from,
		).toBe(last);
		expect(
			thrown(() =>
				resolvePeriod({ period: "custom", from: addDays(last, -1), to }, TODAY),
			),
		).toMatchObject({ code: 422, response: { field: "to" } });
	});
});

describe("evolutionUnitOf", () => {
	it("has a bar per day up to 31 days, per 7 days up to about 6 months, and per month beyond", () => {
		expect(evolutionUnitOf({ from: "2026-10-01", to: "2026-10-31" })).toBe(
			"day",
		);
		expect(evolutionUnitOf({ from: "2026-10-01", to: "2026-11-01" })).toBe(
			"week",
		);
		// 183 days.
		expect(evolutionUnitOf({ from: "2026-05-02", to: "2026-10-31" })).toBe(
			"week",
		);
		expect(evolutionUnitOf({ from: "2026-04-01", to: "2026-10-31" })).toBe(
			"month",
		);
	});
});

describe("bars", () => {
	it("starts a day bar on the day, a month bar on the 1st and a week bar every 7 days from the start", () => {
		const range = { from: "2026-09-10", to: "2026-11-09" };

		expect(bucketStart("2026-10-03", "day", range)).toBe("2026-10-03");
		expect(bucketStart("2026-10-03", "month", range)).toBe("2026-10-01");
		expect(bucketStart("2026-09-16", "week", range)).toBe("2026-09-10");
		expect(bucketStart("2026-09-17", "week", range)).toBe("2026-09-17");
	});

	it("lists every bar of the period, empty ones included", () => {
		expect(
			bucketStarts("day", { from: "2026-11-07", to: "2026-11-09" }),
		).toEqual(["2026-11-07", "2026-11-08", "2026-11-09"]);
		expect(
			bucketStarts("week", { from: "2026-10-01", to: "2026-10-20" }),
		).toEqual(["2026-10-01", "2026-10-08", "2026-10-15"]);
		expect(
			bucketStarts("month", { from: "2026-08-20", to: "2026-11-02" }),
		).toEqual(["2026-08-01", "2026-09-01", "2026-10-01", "2026-11-01"]);
	});
});
