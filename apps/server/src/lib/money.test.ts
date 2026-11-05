import { describe, expect, it } from "bun:test";
import { divideRounded, FULL_PERCENT, MAX_CENTS, percentOf } from "./money";

describe("divideRounded", () => {
	it("divides exactly when there's no remainder", () => {
		expect(divideRounded(1000, 4)).toBe(250);
		expect(divideRounded(0, 7)).toBe(0);
		expect(divideRounded(-1000, 4)).toBe(-250);
	});

	it("rounds to the nearest integer", () => {
		// R$ 10,00 in 3 units: R$ 3,33 each.
		expect(divideRounded(1000, 3)).toBe(333);
		// R$ 20,00 in 3 units: R$ 6,67 each.
		expect(divideRounded(2000, 3)).toBe(667);
		expect(divideRounded(-1000, 3)).toBe(-333);
		expect(divideRounded(-2000, 3)).toBe(-667);
	});

	it("rounds halves away from zero", () => {
		expect(divideRounded(5, 2)).toBe(3);
		expect(divideRounded(-5, 2)).toBe(-3);
		expect(divideRounded(15, 10)).toBe(2);
		expect(divideRounded(25, 10)).toBe(3);
		expect(divideRounded(-25, 10)).toBe(-3);
		expect(divideRounded(1, 2)).toBe(1);
		expect(divideRounded(-1, 2)).toBe(-1);
	});

	it("never returns negative zero", () => {
		expect(Object.is(divideRounded(-1, 3), 0)).toBe(true);
		expect(Object.is(divideRounded(-0, 3), 0)).toBe(true);
	});

	it("stays exact on large values, where a float division would drift", () => {
		const big = Number.MAX_SAFE_INTEGER - 1;
		expect(divideRounded(big, 2)).toBe(big / 2);
		expect(divideRounded(MAX_CENTS * FULL_PERCENT, FULL_PERCENT)).toBe(
			MAX_CENTS,
		);
	});

	it("refuses fractions, unsafe integers and a denominator that isn't positive", () => {
		expect(() => divideRounded(1.5, 2)).toThrow(RangeError);
		expect(() => divideRounded(1, 2.5)).toThrow(RangeError);
		expect(() => divideRounded(Number.NaN, 2)).toThrow(RangeError);
		expect(() => divideRounded(Number.POSITIVE_INFINITY, 2)).toThrow(
			RangeError,
		);
		expect(() => divideRounded(Number.MAX_SAFE_INTEGER + 1, 2)).toThrow(
			RangeError,
		);
		expect(() => divideRounded(1, 0)).toThrow(RangeError);
		expect(() => divideRounded(1, -2)).toThrow(RangeError);
	});
});

describe("percentOf", () => {
	it("takes a percentage in basis points of an amount in cents", () => {
		// 10% of R$ 92,50.
		expect(percentOf(9250, 1000)).toBe(925);
		// 12,5% of R$ 200,00.
		expect(percentOf(20_000, 1250)).toBe(2500);
		expect(percentOf(9250, FULL_PERCENT)).toBe(9250);
		expect(percentOf(9250, 0)).toBe(0);
		expect(percentOf(0, 1000)).toBe(0);
	});

	it("rounds to the cent, halves away from zero", () => {
		// 10% of R$ 0,05 = R$ 0,005 → R$ 0,01.
		expect(percentOf(5, 1000)).toBe(1);
		// 10% of R$ 0,04 = R$ 0,004 → R$ 0,00.
		expect(percentOf(4, 1000)).toBe(0);
		// 16,5% of R$ 33,33 = R$ 5,49945 → R$ 5,50.
		expect(percentOf(3333, 1650)).toBe(550);
		// 0,01% of R$ 0,50 = R$ 0,00005 → R$ 0,00.
		expect(percentOf(50, 1)).toBe(0);
		expect(percentOf(-5, 1000)).toBe(-1);
	});

	it("handles the largest amount at 100%", () => {
		expect(percentOf(MAX_CENTS, FULL_PERCENT)).toBe(MAX_CENTS);
	});

	it("refuses non-integer cents or basis points", () => {
		expect(() => percentOf(92.5, 1000)).toThrow(RangeError);
		expect(() => percentOf(9250, 12.5)).toThrow(RangeError);
	});

	it("refuses a product too large to compute exactly", () => {
		expect(() => percentOf(Number.MAX_SAFE_INTEGER, 2)).toThrow(RangeError);
	});
});
