import { describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { app } from "../../src/app";
import { useTestDatabase } from "../support/database";
import { signedIn } from "../support/factories/accounts";
import {
	createCategory,
	createProduct,
	productBody,
} from "../support/factories/catalog";

useTestDatabase();

const api = treaty(app);

describe("products routes", () => {
	it("creates, reads, edits, archives and reactivates", async () => {
		const { headers } = await signedIn();

		const created = await api.products.post(
			productBody({ name: "Perfume", basePrice: 9250 }),
			{ headers },
		);
		const id = created.data?.id ?? "";
		const read = await api.products({ id }).get({ headers });
		const edited = await api
			.products({ id })
			.put(productBody({ name: "Perfume Floral", basePrice: 9500 }), {
				headers,
			});
		const archived = await api
			.products({ id })
			.archive.post(undefined, { headers });
		const back = await api
			.products({ id })
			.reactivate.post(undefined, { headers });

		expect(created.data).toMatchObject({ name: "Perfume", basePrice: 9250 });
		expect(read.data?.id).toBe(id);
		expect(edited.data).toMatchObject({
			name: "Perfume Floral",
			basePrice: 9500,
		});
		expect(archived.data?.archived).toBe(true);
		expect(back.data?.archived).toBe(false);
	});

	it("lists with search, categories, archived and cursor in the query", async () => {
		const { headers, session } = await signedIn();
		const storeId = session.store.id;
		const a = await createCategory(storeId);
		const b = await createCategory(storeId);
		await createProduct(storeId, { name: "Batom", categoryId: a.id });
		await createProduct(storeId, { name: "Base", categoryId: b.id });
		await createProduct(storeId, { name: "Bálsamo", archived: true });

		const both = await api.products.get({
			query: { search: "ba", categoryIds: [a.id, b.id] },
			headers,
		});
		const one = await api.products.get({
			query: { categoryIds: [a.id] },
			headers,
		});
		const archived = await api.products.get({
			query: { archived: true, cursor: 0 },
			headers,
		});

		expect(both.data).toMatchObject({ total: 2, nextCursor: null });
		expect(both.data?.items.map((item) => item.name)).toEqual([
			"Base",
			"Batom",
		]);
		expect(one.data?.items.map((item) => item.name)).toEqual(["Batom"]);
		expect(archived.data?.items.map((item) => item.name)).toEqual(["Bálsamo"]);
	});

	it("answers 422 for a missing name, a zero price and a bad category id", async () => {
		const { headers } = await signedIn();

		const name = await api.products.post(productBody({ name: "" }), {
			headers,
		});
		const price = await api.products.post(productBody({ basePrice: 0 }), {
			headers,
		});
		const category = await api.products.post(
			productBody({ categoryId: crypto.randomUUID() }),
			{ headers },
		);

		expect(name.error?.value).toMatchObject({
			code: "validation",
			field: "name",
		});
		expect(price.error?.value).toMatchObject({ field: "basePrice" });
		expect(category.error?.value).toMatchObject({
			code: "category_not_found",
			field: "categoryId",
		});
	});

	it("answers 422 for a price that isn't whole cents, and saves nothing", async () => {
		const { headers } = await signedIn();
		// An old app sends a decimal string; a float or a negative is a broken client. None is ever rounded.
		const prices: unknown[] = [
			"92.50",
			"9250",
			92.5,
			-100,
			2_147_483_648,
			null,
		];

		for (const basePrice of prices) {
			const { error } = await api.products.post(
				// @ts-expect-error: what a client outside the contract sends
				productBody({ basePrice }),
				{ headers },
			);
			expect(error?.status).toBe(422);
			expect(error?.value).toMatchObject({
				code: "validation",
				field: "basePrice",
			});
		}
		const list = await api.products.get({ query: {}, headers });
		expect(list.data?.total).toBe(0);
	});

	it("answers 422 for an edit with a price that isn't whole cents, and keeps the saved one", async () => {
		const { headers, session } = await signedIn();
		const product = await createProduct(session.store.id, { basePrice: 9250 });

		for (const basePrice of ["95", "95.00", 95.5] as unknown[]) {
			const { error } = await api.products({ id: product.id }).put(
				// @ts-expect-error: what a client outside the contract sends
				productBody({ basePrice }),
				{ headers },
			);
			expect(error?.status).toBe(422);
			expect(error?.value).toMatchObject({
				code: "validation",
				field: "basePrice",
			});
		}
		const read = await api.products({ id: product.id }).get({ headers });
		expect(read.data?.basePrice).toBe(9250);
	});

	it("answers 409 for a repeated code and for editing an archived product", async () => {
		const { headers, session } = await signedIn();
		await createProduct(session.store.id, { barcode: "789" });
		const archived = await createProduct(session.store.id, { archived: true });

		const duplicate = await api.products.post(productBody({ barcode: "789" }), {
			headers,
		});
		const edit = await api
			.products({ id: archived.id })
			.put(productBody(), { headers });

		expect(duplicate.error?.status).toBe(409);
		expect(duplicate.error?.value).toMatchObject({ field: "barcode" });
		expect(edit.error?.value).toMatchObject({ code: "product_archived" });
	});

	it("answers 404 for another store's product", async () => {
		const other = await signedIn();
		const foreign = await createProduct(other.session.store.id);
		const { headers } = await signedIn();

		const { error } = await api.products({ id: foreign.id }).get({ headers });

		expect(error?.status).toBe(404);
		expect(error?.value).toMatchObject({ code: "product_not_found" });
	});

	it("answers 422 for a bad list query and a bad id", async () => {
		const { headers } = await signedIn();

		const cursor = await api.products.get({ query: { cursor: -1 }, headers });
		const category = await api.products.get({
			query: { categoryIds: ["x"] },
			headers,
		});
		const id = await api.products({ id: "x" }).archive.post(undefined, {
			headers,
		});

		expect(cursor.error?.status).toBe(422);
		expect(category.error?.status).toBe(422);
		expect(id.error?.status).toBe(422);
	});

	it("answers on edit: 404 for an unknown product, 409 for a repeated internal code, 422 for an archived category", async () => {
		const { headers, session } = await signedIn();
		const storeId = session.store.id;
		await createProduct(storeId, { internalCode: "AB-1" });
		const product = await createProduct(storeId);
		const archived = await createCategory(storeId, { archived: true });

		const missing = await api
			.products({ id: crypto.randomUUID() })
			.put(productBody(), { headers });
		const code = await api
			.products({ id: product.id })
			.put(productBody({ internalCode: "ab-1" }), { headers });
		const category = await api
			.products({ id: product.id })
			.put(productBody({ categoryId: archived.id }), { headers });

		expect(missing.error?.value).toMatchObject({ code: "product_not_found" });
		expect(code.error?.status).toBe(409);
		expect(code.error?.value).toMatchObject({
			code: "duplicate_internal_code",
			field: "internalCode",
		});
		expect(category.error?.status).toBe(422);
		expect(category.error?.value).toMatchObject({ code: "category_archived" });
	});

	it("answers 404 when archiving or reactivating an unknown product", async () => {
		const { headers } = await signedIn();
		const product = api.products({ id: crypto.randomUUID() });

		const archive = await product.archive.post(undefined, { headers });
		const reactivate = await product.reactivate.post(undefined, { headers });

		expect([archive.error?.status, reactivate.error?.status]).toEqual([
			404, 404,
		]);
	});

	it("answers 401 on every route without a session", async () => {
		const product = api.products({ id: crypto.randomUUID() });

		const statuses = await Promise.all([
			api.products.get({ query: {} }),
			api.products.post(productBody()),
			product.get(),
			product.put(productBody()),
			product.archive.post(),
			product.reactivate.post(),
		]);

		expect(statuses.map((result) => result.error?.status)).toEqual([
			401, 401, 401, 401, 401, 401,
		]);
	});
});
