import { describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { app } from "../../src/app";
import { useTestDatabase } from "../support/database";
import { signedIn } from "../support/factories/accounts";
import { createReseller, resellerBody } from "../support/factories/resellers";

useTestDatabase();

const api = treaty(app);

describe("resellers routes", () => {
	it("creates, gets, edits, archives, lists and reactivates", async () => {
		const { headers } = await signedIn();

		const created = await api.resellers.post(
			resellerBody({ name: "Ana", phone: "(11) 99999-8888" }),
			{ headers },
		);
		const id = created.data?.id ?? "";
		const got = await api.resellers({ id }).get({ headers });
		const edited = await api
			.resellers({ id })
			.put(resellerBody({ name: "Ana Souza", defaultCommission: "12.5" }), {
				headers,
			});
		const archived = await api
			.resellers({ id })
			.archive.post(undefined, { headers });
		const listed = await api.resellers.get({
			headers,
			query: { archived: true, search: "souza" },
		});
		const back = await api
			.resellers({ id })
			.reactivate.post(undefined, { headers });

		expect(created.data).toMatchObject({
			name: "Ana",
			phone: "11999998888",
			archived: false,
			salesCount: 0,
		});
		expect(got.data).toEqual(created.data);
		expect(edited.data).toMatchObject({
			name: "Ana Souza",
			defaultCommission: "12.5",
		});
		expect(archived.data?.archived).toBe(true);
		expect(listed.data?.map((reseller) => reseller.id)).toEqual([id]);
		expect(back.data?.archived).toBe(false);
	});

	it("answers 422 for a blank name, a commission over 100%, a bad phone and an id that isn't a uuid", async () => {
		const { headers } = await signedIn();

		const blank = await api.resellers.post(resellerBody({ name: "  " }), {
			headers,
		});
		const over = await api.resellers.post(
			resellerBody({ defaultCommission: "100.5" }),
			{ headers },
		);
		const phone = await api.resellers.post(
			resellerBody({ phone: "9999-8888" }),
			{ headers },
		);
		const badId = await api.resellers({ id: "x" }).get({ headers });

		expect(blank.error?.value).toMatchObject({
			code: "validation",
			field: "name",
		});
		expect(over.error?.value).toMatchObject({
			code: "validation",
			field: "defaultCommission",
		});
		expect(phone.error?.value).toMatchObject({
			code: "validation",
			field: "phone",
		});
		expect(badId.error?.status).toBe(422);
	});

	it("answers 409 when editing an archived reseller", async () => {
		const { headers, session } = await signedIn();
		const reseller = await createReseller(session.store.id, { archived: true });

		const { error } = await api
			.resellers({ id: reseller.id })
			.put(resellerBody(), { headers });

		expect(error?.status).toBe(409);
		expect(error?.value).toMatchObject({ code: "reseller_archived" });
	});

	it("answers 404 for a reseller of another store", async () => {
		const other = await signedIn();
		const foreign = await createReseller(other.session.store.id);
		const { headers } = await signedIn();
		const reseller = api.resellers({ id: foreign.id });

		const results = await Promise.all([
			reseller.get({ headers }),
			reseller.put(resellerBody(), { headers }),
			reseller.archive.post(undefined, { headers }),
			reseller.reactivate.post(undefined, { headers }),
		]);

		expect(results.map((result) => result.error?.status)).toEqual([
			404, 404, 404, 404,
		]);
		expect(results[0]?.error?.value).toMatchObject({
			code: "reseller_not_found",
		});
	});

	it("answers 401 on every route without a session", async () => {
		const reseller = api.resellers({ id: crypto.randomUUID() });

		const results = await Promise.all([
			api.resellers.get(),
			api.resellers.post(resellerBody()),
			reseller.get(),
			reseller.put(resellerBody()),
			reseller.archive.post(),
			reseller.reactivate.post(),
		]);

		expect(results.map((result) => result.error?.status)).toEqual([
			401, 401, 401, 401, 401, 401,
		]);
	});
});
