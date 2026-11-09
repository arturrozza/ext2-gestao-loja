import { describe, expect, it } from "bun:test";
import { Value } from "@sinclair/typebox/value";
import {
	dayField,
	expiryMonthField,
	MAX_LINE_UNITS,
	moneyField,
	optionalText,
	percentField,
	unitsField,
} from "./fields";
import { MAX_CENTS } from "./money";

/** What a client could send that isn't a whole number: floats, strings, decimals as text, nothing. */
const notIntegers = [
	92.5,
	0.1,
	"9250",
	"10",
	"0",
	"92.50",
	"12.5",
	null,
	true,
	Number.NaN,
	Number.POSITIVE_INFINITY,
];

describe("moneyField", () => {
	it("accepts whole cents from zero to the integer column's limit", () => {
		for (const value of [0, 1, 9250, MAX_CENTS]) {
			expect(Value.Check(moneyField, value)).toBe(true);
		}
	});

	it("refuses negatives, values over the limit and anything that isn't an integer", () => {
		for (const value of [-1, MAX_CENTS + 1, ...notIntegers]) {
			expect(Value.Check(moneyField, value)).toBe(false);
		}
	});
});

describe("percentField", () => {
	it("accepts 0 to 10000 basis points (0% to 100%)", () => {
		for (const value of [0, 1, 750, 1225, 9999, 10_000]) {
			expect(Value.Check(percentField, value)).toBe(true);
		}
	});

	it("refuses negatives, more than 100% and anything that isn't an integer", () => {
		for (const value of [-1, 10_001, ...notIntegers]) {
			expect(Value.Check(percentField, value)).toBe(false);
		}
	});
});

describe("optionalText", () => {
	it("takes null or text up to its length", () => {
		const field = optionalText(3);
		expect(Value.Check(field, null)).toBe(true);
		expect(Value.Check(field, "abc")).toBe(true);
		expect(Value.Check(field, "abcd")).toBe(false);
	});
});

describe("unitsField", () => {
	it("accepts whole units from 1 to the line limit", () => {
		for (const value of [1, 10, MAX_LINE_UNITS]) {
			expect(Value.Check(unitsField, value)).toBe(true);
		}
	});

	it("refuses zero, negatives, too many and anything that isn't an integer", () => {
		for (const value of [0, -1, MAX_LINE_UNITS + 1, ...notIntegers]) {
			expect(Value.Check(unitsField, value)).toBe(false);
		}
	});
});

describe("expiryMonthField", () => {
	it("accepts a year and a month", () => {
		for (const value of ["2027-01", "2027-12"]) {
			expect(Value.Check(expiryMonthField, value)).toBe(true);
		}
	});

	it("refuses a day, a month out of range and other shapes", () => {
		for (const value of ["2027-03-01", "2027-00", "2027-13", "03/2027", ""]) {
			expect(Value.Check(expiryMonthField, value)).toBe(false);
		}
	});
});

describe("dayField", () => {
	it("takes the YYYY-MM-DD shape only (whether the day exists is a rule)", () => {
		expect(Value.Check(dayField, "2026-11-09")).toBe(true);
		for (const value of ["2026-11-9", "09/11/2026", "2026-11-09T10:00:00Z"]) {
			expect(Value.Check(dayField, value)).toBe(false);
		}
	});
});
