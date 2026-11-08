import { describe, expect, it } from "bun:test";
import { normalizeReseller } from "./resellers.rules";

describe("normalizeReseller", () => {
	it("normalizes the person data and keeps the default commission as sent", () => {
		expect(
			normalizeReseller({
				name: "  Ána   Souza ",
				phone: "(11) 99999-8888",
				defaultCommission: 750,
				note: " ",
			}),
		).toEqual({
			name: "Ána Souza",
			phone: "11999998888",
			defaultCommission: 750,
			note: null,
			searchText: "ana souza 11999998888",
		});
	});
});
