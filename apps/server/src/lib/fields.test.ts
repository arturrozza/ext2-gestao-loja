import { describe, expect, it } from "bun:test";
import { Value } from "@sinclair/typebox/value";
import { moneyField, optionalText, percentField } from "./fields";
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
