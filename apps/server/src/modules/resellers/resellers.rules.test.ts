import { describe, expect, it } from "bun:test";
import { thrown } from "../../../test/support/thrown";
import { normalizeReseller, resellerSearchTerms } from "./resellers.rules";

const input = {
	name: "Ana",
	phone: null,
	defaultCommission: "10",
	note: null,
};

describe("normalizeReseller", () => {
	it("trims, collapses spaces, keeps the phone digits and builds the search text from name and phone", () => {
		expect(
			normalizeReseller({
				...input,
				name: "  Ána   Souza ",
				phone: "(11) 99999-8888",
				note: "  atende o Jardins ",
			}),
		).toEqual({
			name: "Ána Souza",
			phone: "11999998888",
			defaultCommission: "10",
			note: "atende o Jardins",
			searchText: "ana souza 11999998888",
		});
	});

	it("turns a blank phone and note into null", () => {
		expect(normalizeReseller({ ...input, phone: " ", note: "  " })).toEqual({
			...input,
			searchText: "ana",
		});
	});

	it("accepts landline and mobile numbers with area code, masked or not", () => {
		const cases: [string, string][] = [
			["1133334444", "1133334444"],
			["(11) 3333-4444", "1133334444"],
			["11999998888", "11999998888"],
		];
		for (const [phone, digits] of cases) {
			expect(normalizeReseller({ ...input, phone }).phone).toBe(digits);
		}
	});

	it("refuses a phone without the area code or too long, on its field", () => {
		for (const phone of ["99998888", "119999988881", "abc"]) {
			expect(
				thrown(() => normalizeReseller({ ...input, phone })),
			).toMatchObject({
				code: 422,
				response: { code: "validation", field: "phone" },
			});
		}
	});
});

describe("resellerSearchTerms", () => {
	it("matches a piece of a masked phone as typed or as digits, and other words as typed", () => {
		expect(resellerSearchTerms(" Ána (11) 99999-8888 ")).toEqual([
			["ana"],
			["(11)", "11"],
			["99999-8888", "999998888"],
		]);
		expect(resellerSearchTerms("1-2 12")).toEqual([["1-2", "12"], ["12"]]);
		expect(resellerSearchTerms(undefined)).toEqual([]);
	});
});
