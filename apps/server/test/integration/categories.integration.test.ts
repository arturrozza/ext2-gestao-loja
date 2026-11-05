import { describe, expect, it } from "bun:test";
import { CategoriesService } from "../../src/modules/categories/categories.service";
import { useTestDatabase } from "../support/database";
import { signedIn } from "../support/factories/accounts";
import { createCategory, createProduct } from "../support/factories/catalog";

useTestDatabase();

describe("CategoriesService", () => {
	it("lists only the store's categories by name, counting active products", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const perfumes = await createCategory(storeId, { name: "Perfumes" });
		await createCategory(storeId, { name: "Cremes", archived: true });
		await createProduct(storeId, { categoryId: perfumes.id });
		await createProduct(storeId, { categoryId: perfumes.id, archived: true });
		const other = await signedIn();
		await createCategory(other.session.store.id, { name: "Da outra loja" });

		const list = await CategoriesService.list(storeId);

		expect(list).toEqual([
			{
				id: expect.any(String),
				name: "Cremes",
				archived: true,
				productCount: 0,
			},
			{ id: perfumes.id, name: "Perfumes", archived: false, productCount: 1 },
		]);
	});

	it("creates with a trimmed name", async () => {
		const { session } = await signedIn();

		const created = await CategoriesService.create(session, {
			name: "  Maquiagem ",
		});

		expect(created).toMatchObject({
			name: "Maquiagem",
			archived: false,
			productCount: 0,
		});
	});

	it("refuses a name already in the store regardless of case and accents, archived ones included", async () => {
		const { session } = await signedIn();
		await createCategory(session.store.id, { name: "Perfumaria" });
		await createCategory(session.store.id, { name: "Cremes", archived: true });

		await expect(
			CategoriesService.create(session, { name: "PERFUMÁRIA" }),
		).rejects.toMatchObject({
			code: 409,
			response: {
				code: "duplicate_category",
				field: "name",
				message: "Essa categoria já existe.",
			},
		});
		await expect(
			CategoriesService.create(session, { name: "cremes" }),
		).rejects.toMatchObject({
			code: 409,
			response: { message: expect.stringContaining("arquivada") },
		});
	});

	it("lets only one of two simultaneous creates take a name", async () => {
		const { session } = await signedIn();

		const results = await Promise.allSettled([
			CategoriesService.create(session, { name: "Perfumes" }),
			CategoriesService.create(session, { name: "perfumes" }),
		]);

		expect(results.map((result) => result.status).sort()).toEqual([
			"fulfilled",
			"rejected",
		]);
		expect(await CategoriesService.list(session.store.id)).toHaveLength(1);
	});

	it("collapses inner spaces in the name", async () => {
		const { session } = await signedIn();

		const created = await CategoriesService.create(session, {
			name: "Cuidados   com a pele",
		});

		expect(created.name).toBe("Cuidados com a pele");
	});

	it("allows the same name in another store", async () => {
		const other = await signedIn();
		await createCategory(other.session.store.id, { name: "Perfumes" });
		const { session } = await signedIn();

		const created = await CategoriesService.create(session, {
			name: "Perfumes",
		});

		expect(created.name).toBe("Perfumes");
	});

	it("renames, keeping the products in it", async () => {
		const { session } = await signedIn();
		const category = await createCategory(session.store.id, {
			name: "Perfume",
		});
		await createProduct(session.store.id, { categoryId: category.id });

		const renamed = await CategoriesService.rename(session, category.id, {
			name: "Perfumes",
		});

		expect(renamed).toMatchObject({ name: "Perfumes", productCount: 1 });
	});

	it("renames to another case of its own name, and refuses another category's name", async () => {
		const { session } = await signedIn();
		const category = await createCategory(session.store.id, {
			name: "perfumes",
		});
		await createCategory(session.store.id, { name: "Cremes" });

		const renamed = await CategoriesService.rename(session, category.id, {
			name: "Perfumes",
		});
		expect(renamed.name).toBe("Perfumes");
		await expect(
			CategoriesService.rename(session, category.id, { name: "Cremes" }),
		).rejects.toMatchObject({
			code: 409,
			response: { code: "duplicate_category" },
		});
	});

	it("archives and reactivates; products keep the category", async () => {
		const { session } = await signedIn();
		const category = await createCategory(session.store.id);
		await createProduct(session.store.id, { categoryId: category.id });

		const archived = await CategoriesService.setArchived(
			session,
			category.id,
			true,
		);
		const again = await CategoriesService.setArchived(
			session,
			category.id,
			true,
		);
		const back = await CategoriesService.setArchived(
			session,
			category.id,
			false,
		);

		expect(archived).toMatchObject({ archived: true, productCount: 1 });
		expect(again.archived).toBe(true);
		expect(back.archived).toBe(false);
	});

	it("doesn't touch another store's category", async () => {
		const other = await signedIn();
		const foreign = await createCategory(other.session.store.id);
		const { session } = await signedIn();

		for (const call of [
			() => CategoriesService.rename(session, foreign.id, { name: "X" }),
			() => CategoriesService.setArchived(session, foreign.id, true),
		]) {
			await expect(call()).rejects.toMatchObject({
				code: 404,
				response: { code: "category_not_found" },
			});
		}
	});
});
