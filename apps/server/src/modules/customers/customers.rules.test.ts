import { describe, expect, it } from "bun:test";
import { normalizeCustomer } from "./customers.rules";

const body = { name: "  Ána   Souza ", phone: "(11) 99999-8888", note: " " };

describe("normalizeCustomer", () => {
	it("normalizes the person data and trims the address, out of the search text", () => {
		expect(
			normalizeCustomer({ ...body, address: " Rua das Flores, 120 " }),
		).toEqual({
			name: "Ána Souza",
			phone: "11999998888",
			address: "Rua das Flores, 120",
			note: null,
			searchText: "ana souza 11999998888",
		});
	});

	it("saves a blank address as none", () => {
		expect(normalizeCustomer({ ...body, address: "  " }).address).toBeNull();
		expect(normalizeCustomer({ ...body, address: null }).address).toBeNull();
	});

	it("leaves an address that wasn't sent untouched", () => {
		expect(normalizeCustomer(body).address).toBeUndefined();
	});
});
