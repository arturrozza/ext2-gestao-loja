import { describe, expect, it } from "bun:test";
import { normalizeSearch, searchPatterns } from "./search";

describe("normalizeSearch", () => {
	it("drops accents and case, and collapses spaces", () => {
		expect(normalizeSearch("  Perfúme   ÁGUA de Coco ")).toBe(
			"perfume agua de coco",
		);
	});
});

describe("searchPatterns", () => {
	it("makes one pattern per word", () => {
		expect(searchPatterns("Floral  Perfúme")).toEqual([
			"%floral%",
			"%perfume%",
		]);
	});

	it("escapes LIKE wildcards so they match literally", () => {
		expect(searchPatterns("50%_off\\")).toEqual(["%50\\%\\_off\\\\%"]);
	});

	it("is empty without a query", () => {
		expect(searchPatterns(undefined)).toEqual([]);
		expect(searchPatterns("   ")).toEqual([]);
	});
});
