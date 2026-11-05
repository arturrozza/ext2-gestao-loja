import { describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { app } from "../../src/app";
import { useTestDatabase } from "../support/database";
import { signedIn } from "../support/factories/accounts";
import { createCategory } from "../support/factories/catalog";

useTestDatabase();

const api = treaty(app);

describe("categories routes", () => {
	it("creates, lists, renames, archives and reactivates", async () => {
		const { headers } = await signedIn();

		const created = await api.categories.post({ name: "Perfume" }, { headers });
		const id = created.data?.id ?? "";
		const renamed = await api
			.categories({ id })
			.put({ name: "Perfumes" }, { headers });
		const archived = await api
			.categories({ id })
			.archive.post(undefined, { headers });
		const listed = await api.categories.get({ headers });
		const back = await api
			.categories({ id })
			.reactivate.post(undefined, { headers });

		expect(created.data).toMatchObject({ name: "Perfume", archived: false });
		expect(renamed.data?.name).toBe("Perfumes");
		expect(archived.data?.archived).toBe(true);
		expect(listed.data).toEqual([
			{ id, name: "Perfumes", archived: true, productCount: 0 },
		]);
		expect(back.data?.archived).toBe(false);
	});

	it("answers 422 for a blank name and an id that isn't a uuid", async () => {
		const { headers } = await signedIn();

		const blank = await api.categories.post({ name: "  " }, { headers });
		const badId = await api
			.categories({ id: "x" })
			.put({ name: "Perfumes" }, { headers });

		expect(blank.error?.value).toMatchObject({
			code: "validation",
			field: "name",
		});
		expect(badId.error?.status).toBe(422);
	});

	it("answers 409 for a name already taken", async () => {
		const { headers, session } = await signedIn();
		await createCategory(session.store.id, { name: "Perfumes" });

		const { error } = await api.categories.post(
			{ name: "perfumes" },
			{ headers },
		);

		expect(error?.status).toBe(409);
		expect(error?.value).toMatchObject({
			code: "duplicate_category",
			field: "name",
		});
	});

	it("answers 409 when renaming onto another category's name", async () => {
		const { headers, session } = await signedIn();
		await createCategory(session.store.id, { name: "Perfumes" });
		const other = await createCategory(session.store.id, { name: "Cremes" });

		const { error } = await api
			.categories({ id: other.id })
			.put({ name: "PERFUMES" }, { headers });

		expect(error?.status).toBe(409);
		expect(error?.value).toMatchObject({ code: "duplicate_category" });
	});

	it("answers 404 for a category of another store", async () => {
		const other = await signedIn();
		const foreign = await createCategory(other.session.store.id);
		const { headers } = await signedIn();

		const rename = await api
			.categories({ id: foreign.id })
			.put({ name: "X" }, { headers });
		const archive = await api
			.categories({ id: foreign.id })
			.archive.post(undefined, { headers });
		const reactivate = await api
			.categories({ id: foreign.id })
			.reactivate.post(undefined, { headers });

		expect([
			rename.error?.status,
			archive.error?.status,
			reactivate.error?.status,
		]).toEqual([404, 404, 404]);
		expect(rename.error?.value).toMatchObject({ code: "category_not_found" });
	});

	it("answers 401 on every route without a session", async () => {
		const category = api.categories({ id: crypto.randomUUID() });

		const statuses = await Promise.all([
			api.categories.get(),
			api.categories.post({ name: "X" }),
			category.put({ name: "X" }),
			category.archive.post(),
			category.reactivate.post(),
		]);

		expect(statuses.map((result) => result.error?.status)).toEqual([
			401, 401, 401, 401, 401,
		]);
	});
});
