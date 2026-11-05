import { describe, expect, it } from "bun:test";
import { thrown } from "../../../test/support/thrown";
import { normalizeProduct } from "./products.rules";

const input = {
	name: "Perfume Floral",
	basePrice: 9250,
	categoryId: null,
	barcode: null,
	internalCode: null,
	minStock: null,
	location: null,
	hasExpiry: false,
};

describe("normalizeProduct", () => {
	it("trims, turns blanks into null and builds the search text from name and codes", () => {
		expect(
			normalizeProduct({
				...input,
				name: " Perfúme Floral ",
				barcode: " 789123 ",
				internalCode: " PF-01 ",
				location: "  ",
			}),
		).toEqual({
			...input,
			name: "Perfúme Floral",
			barcode: "789123",
			internalCode: "PF-01",
			location: null,
			searchText: "perfume floral pf-01 789123",
		});
	});

	it("refuses a zero base price, on its field", () => {
		expect(
			thrown(() => normalizeProduct({ ...input, basePrice: 0 })),
		).toMatchObject({
			code: 422,
			response: { code: "validation", field: "basePrice" },
		});
	});

	it("keeps the price in cents as it came, the smallest one included", () => {
		expect(normalizeProduct({ ...input, basePrice: 1 }).basePrice).toBe(1);
		expect(normalizeProduct({ ...input, basePrice: 9255 }).basePrice).toBe(
			9255,
		);
	});
});
