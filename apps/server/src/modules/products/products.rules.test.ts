import { describe, expect, it } from "bun:test";
import { normalizeProduct } from "./products.rules";

/** What a call threw (Elysia's `status()` isn't an `Error`, so `toThrow` can't match it). */
function thrown(call: () => void): unknown {
	try {
		call();
	} catch (error) {
		return error;
	}
	return undefined;
}

const input = {
	name: "Perfume Floral",
	basePrice: "92.5",
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
		for (const basePrice of ["0", "0.00"]) {
			expect(
				thrown(() => normalizeProduct({ ...input, basePrice })),
			).toMatchObject({
				code: 422,
				response: { code: "validation", field: "basePrice" },
			});
		}
	});

	it("accepts the smallest price", () => {
		expect(normalizeProduct({ ...input, basePrice: "0.01" }).basePrice).toBe(
			"0.01",
		);
	});
});
