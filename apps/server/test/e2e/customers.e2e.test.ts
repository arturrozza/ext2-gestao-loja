import { describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { app } from "../../src/app";
import { useTestDatabase } from "../support/database";
import { signedIn } from "../support/factories/accounts";
import { createCustomer, customerBody } from "../support/factories/customers";

useTestDatabase();

const api = treaty(app);

describe("customers routes", () => {
	it("creates, gets, edits, archives, lists and reactivates", async () => {
		const { headers } = await signedIn();

		const created = await api.customers.post(
			customerBody({ name: "Ana", phone: "(11) 99999-8888" }),
			{ headers },
		);
		const id = created.data?.id ?? "";
		const got = await api.customers({ id }).get({ headers });
		const edited = await api
			.customers({ id })
			.put(customerBody({ name: "Ana Souza", note: "VIP" }), { headers });
		const archived = await api
			.customers({ id })
			.archive.post(undefined, { headers });
		const listed = await api.customers.get({
			headers,
			query: { archived: true, search: "souza", cursor: 0 },
		});
		const back = await api
			.customers({ id })
			.reactivate.post(undefined, { headers });

		expect(created.data).toMatchObject({
			name: "Ana",
			phone: "11999998888",
			note: null,
			archived: false,
			purchasesCount: 0,
			totalSpent: 0,
			lastPurchaseAt: null,
		});
		expect(got.data).toEqual(created.data);
		expect(edited.data).toMatchObject({ name: "Ana Souza", note: "VIP" });
		expect(archived.data?.archived).toBe(true);
		expect(listed.data).toMatchObject({ nextCursor: null, total: 1 });
		expect(listed.data?.items.map((customer) => customer.id)).toEqual([id]);
		expect(back.data?.archived).toBe(false);
	});

	it("answers 422 for a blank name, a bad phone, a negative cursor and an id that isn't a uuid", async () => {
		const { headers } = await signedIn();

		const blank = await api.customers.post(customerBody({ name: "  " }), {
			headers,
		});
		const phone = await api.customers.post(
			customerBody({ phone: "9999-8888" }),
			{ headers },
		);
		const cursor = await api.customers.get({ headers, query: { cursor: -1 } });
		const badId = await api.customers({ id: "x" }).get({ headers });

		expect(blank.error?.value).toMatchObject({
			code: "validation",
			field: "name",
		});
		expect(phone.error?.value).toMatchObject({
			code: "validation",
			field: "phone",
		});
		expect(cursor.error?.status).toBe(422);
		expect(badId.error?.status).toBe(422);
		expect((await api.customers.get({ headers, query: {} })).data?.total).toBe(
			0,
		);
	});

	it("answers 409 when editing an archived customer", async () => {
		const { headers, session } = await signedIn();
		const customer = await createCustomer(session.store.id, { archived: true });

		const { error } = await api
			.customers({ id: customer.id })
			.put(customerBody(), { headers });

		expect(error?.status).toBe(409);
		expect(error?.value).toMatchObject({ code: "customer_archived" });
	});

	it("answers 404 for a customer of another store", async () => {
		const other = await signedIn();
		const foreign = await createCustomer(other.session.store.id);
		const { headers } = await signedIn();
		const customer = api.customers({ id: foreign.id });

		const results = await Promise.all([
			customer.get({ headers }),
			customer.put(customerBody(), { headers }),
			customer.archive.post(undefined, { headers }),
			customer.reactivate.post(undefined, { headers }),
		]);

		expect(results.map((result) => result.error?.status)).toEqual([
			404, 404, 404, 404,
		]);
		expect(results[0]?.error?.value).toMatchObject({
			code: "customer_not_found",
		});
	});

	it("answers 401 on every route without a session", async () => {
		const customer = api.customers({ id: crypto.randomUUID() });

		const results = await Promise.all([
			api.customers.get(),
			api.customers.post(customerBody()),
			customer.get(),
			customer.put(customerBody()),
			customer.archive.post(),
			customer.reactivate.post(),
		]);

		expect(results.map((result) => result.error?.status)).toEqual([
			401, 401, 401, 401, 401, 401,
		]);
	});
});
