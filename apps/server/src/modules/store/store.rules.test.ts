import { describe, expect, it } from "bun:test";
import { normalizeProfile } from "./store.rules";

/** What a call threw (Elysia's `status()` isn't an `Error`, so `toThrow` can't match it). */
function thrown(call: () => void): unknown {
	try {
		call();
	} catch (error) {
		return error;
	}
	return undefined;
}

const profile = { name: "Loja", document: null, phone: null, address: null };

describe("normalizeProfile", () => {
	it("trims and turns blanks into null", () => {
		expect(
			normalizeProfile({
				name: " Loja ",
				document: " ",
				phone: "",
				address: " Rua A ",
			}),
		).toEqual({ name: "Loja", document: null, phone: null, address: "Rua A" });
	});

	it("accepts a CPF or CNPJ and a phone with area code, masked or not", () => {
		for (const document of ["123.456.789-01", "12345678000190"]) {
			expect(normalizeProfile({ ...profile, document }).document).toBe(
				document,
			);
		}
		for (const phone of ["(11) 3333-4444", "11999998888"]) {
			expect(normalizeProfile({ ...profile, phone }).phone).toBe(phone);
		}
	});

	it("refuses a document or phone with the wrong number of digits, on its field", () => {
		expect(
			thrown(() => normalizeProfile({ ...profile, document: "123" })),
		).toMatchObject({
			code: 422,
			response: { code: "validation", field: "document" },
		});
		expect(
			thrown(() => normalizeProfile({ ...profile, phone: "9999-8888" })),
		).toMatchObject({
			code: 422,
			response: { field: "phone" },
		});
	});
});
