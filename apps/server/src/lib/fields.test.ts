import { describe, expect, it } from "bun:test";
import { Value } from "@sinclair/typebox/value";
import { optionalText, percentField } from "./fields";
import { percentOut } from "./percent";

describe("percentField", () => {
	it("accepts 0 to 100 with up to two decimals", () => {
		for (const value of [
			"0",
			"7.5",
			"12.25",
			"99.99",
			"100",
			"100.0",
			"100.00",
		]) {
			expect(Value.Check(percentField, value)).toBe(true);
		}
	});

	it("refuses more than 100, more than two decimals, commas and loose dots", () => {
		for (const value of [
			"100.01",
			"101",
			"1.234",
			"5.",
			".5",
			"7,5",
			"-1",
			"",
		]) {
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

describe("percentOut", () => {
	it("drops the trailing zeros Postgres keeps", () => {
		expect(percentOut("12.50")).toBe("12.5");
		expect(percentOut("100.00")).toBe("100");
		expect(percentOut("0.00")).toBe("0");
	});
});
