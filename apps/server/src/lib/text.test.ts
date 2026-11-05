import { describe, expect, it } from "bun:test";
import { blankToNull, onlyDigits } from "./text";

describe("blankToNull", () => {
	it("trims and turns blank or missing text into null", () => {
		expect(blankToNull("  Rua A ")).toBe("Rua A");
		expect(blankToNull("   ")).toBeNull();
		expect(blankToNull(null)).toBeNull();
	});
});

describe("onlyDigits", () => {
	it("drops the mask", () => {
		expect(onlyDigits("(11) 99999-8888")).toBe("11999998888");
		expect(onlyDigits("abc")).toBe("");
	});
});
