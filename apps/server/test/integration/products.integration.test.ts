import { describe, expect, it } from "bun:test";
import { PAGE_SIZE } from "../../src/lib/pagination";
import { CategoriesService } from "../../src/modules/categories/categories.service";
import { ProductsService } from "../../src/modules/products/products.service";
import { useTestDatabase } from "../support/database";
import { signedIn } from "../support/factories/accounts";
import {
	createCategory,
	createProduct,
	productBody,
} from "../support/factories/catalog";

useTestDatabase();

const names = (page: { items: { name: string }[] }) =>
	page.items.map((item) => item.name);

describe("ProductsService.create", () => {
	it("saves a trimmed product with blanks as null, active", async () => {
		const { session } = await signedIn();
		const category = await createCategory(session.store.id, {
			name: "Perfumes",
		});

		const product = await ProductsService.create(
			session,
			productBody({
				name: " Perfume Floral ",
				basePrice: "92.5",
				categoryId: category.id,
				barcode: " 7891234 ",
				internalCode: "",
				minStock: 3,
				location: " Prateleira A ",
				hasExpiry: true,
			}),
		);

		expect(product).toMatchObject({
			name: "Perfume Floral",
			basePrice: "92.50",
			categoryId: category.id,
			categoryName: "Perfumes",
			barcode: "7891234",
			internalCode: null,
			minStock: 3,
			location: "Prateleira A",
			hasExpiry: true,
			archived: false,
		});
	});

	it("refuses a barcode or internal code already in the store, archived products included", async () => {
		const { session } = await signedIn();
		await createProduct(session.store.id, {
			barcode: "789",
			internalCode: "PF-01",
			archived: true,
		});

		await expect(
			ProductsService.create(session, productBody({ barcode: "789" })),
		).rejects.toMatchObject({
			code: 409,
			response: { code: "duplicate_barcode", field: "barcode" },
		});
		await expect(
			ProductsService.create(session, productBody({ internalCode: "pf-01" })),
		).rejects.toMatchObject({
			code: 409,
			response: { code: "duplicate_internal_code", field: "internalCode" },
		});
	});

	it("allows the same codes in another store, and many products without codes", async () => {
		const other = await signedIn();
		await createProduct(other.session.store.id, { barcode: "789" });
		const { session } = await signedIn();

		await ProductsService.create(session, productBody({ barcode: "789" }));
		await ProductsService.create(session, productBody());
		await ProductsService.create(session, productBody());

		const page = await ProductsService.list(session.store.id, {});
		expect(page.total).toBe(3);
	});

	it("refuses an archived category, or one from another store", async () => {
		const { session } = await signedIn();
		const archived = await createCategory(session.store.id, { archived: true });
		const other = await signedIn();
		const foreign = await createCategory(other.session.store.id);

		await expect(
			ProductsService.create(session, productBody({ categoryId: archived.id })),
		).rejects.toMatchObject({
			code: 422,
			response: { code: "category_archived", field: "categoryId" },
		});
		await expect(
			ProductsService.create(session, productBody({ categoryId: foreign.id })),
		).rejects.toMatchObject({
			code: 422,
			response: { code: "category_not_found", field: "categoryId" },
		});
	});
});

describe("ProductsService concurrency", () => {
	it("lets only one of two simultaneous creates take a barcode", async () => {
		const { session } = await signedIn();

		const results = await Promise.allSettled([
			ProductsService.create(session, productBody({ barcode: "789" })),
			ProductsService.create(session, productBody({ barcode: "789" })),
		]);

		expect(results.map((result) => result.status).sort()).toEqual([
			"fulfilled",
			"rejected",
		]);
		const failure = results.find((result) => result.status === "rejected");
		expect(failure?.reason).toMatchObject({
			code: 409,
			response: { code: "duplicate_barcode" },
		});
	});

	it("never leaves a new product in a category archived before it was saved", async () => {
		const { session } = await signedIn();
		const category = await createCategory(session.store.id);

		const [created] = await Promise.allSettled([
			ProductsService.create(session, productBody({ categoryId: category.id })),
			CategoriesService.setArchived(session, category.id, true),
		]);

		// Either the product got in first (and keeps the category), or the archive did and the create was refused.
		if (created.status === "rejected") {
			expect(created.reason).toMatchObject({
				response: { code: "category_archived" },
			});
		} else {
			expect(created.value.categoryId).toBe(category.id);
		}
	});
});

describe("ProductsService.update", () => {
	it("saves the new data", async () => {
		const { session } = await signedIn();
		const product = await createProduct(session.store.id, { name: "Antigo" });

		const updated = await ProductsService.update(
			session,
			product.id,
			productBody({ name: "Novo", basePrice: "15" }),
		);

		expect(updated).toMatchObject({ name: "Novo", basePrice: "15.00" });
	});

	it("keeps its own codes, but refuses another product's", async () => {
		const { session } = await signedIn();
		const product = await createProduct(session.store.id, { barcode: "111" });
		await createProduct(session.store.id, { barcode: "222" });

		const same = await ProductsService.update(
			session,
			product.id,
			productBody({ barcode: "111" }),
		);
		expect(same.barcode).toBe("111");
		await expect(
			ProductsService.update(
				session,
				product.id,
				productBody({ barcode: "222" }),
			),
		).rejects.toMatchObject({
			code: 409,
			response: { code: "duplicate_barcode" },
		});
	});

	it("may keep a category archived after the product joined it, but not move into one", async () => {
		const { session } = await signedIn();
		const kept = await createCategory(session.store.id, { archived: true });
		const other = await createCategory(session.store.id, { archived: true });
		// The factory skips the service's checks: the product joined before the category was archived.
		const product = await createProduct(session.store.id, {
			categoryId: kept.id,
		});

		const keep = await ProductsService.update(
			session,
			product.id,
			productBody({ categoryId: kept.id }),
		);
		expect(keep.categoryId).toBe(kept.id);
		await expect(
			ProductsService.update(
				session,
				product.id,
				productBody({ categoryId: other.id }),
			),
		).rejects.toMatchObject({
			code: 422,
			response: { code: "category_archived" },
		});
	});

	it("refuses to edit an archived product", async () => {
		const { session } = await signedIn();
		const product = await createProduct(session.store.id, { archived: true });

		await expect(
			ProductsService.update(session, product.id, productBody()),
		).rejects.toMatchObject({
			code: 409,
			response: { code: "product_archived" },
		});
	});

	it("doesn't find another store's product", async () => {
		const other = await signedIn();
		const foreign = await createProduct(other.session.store.id);
		const { session } = await signedIn();

		for (const call of [
			() => ProductsService.get(session.store.id, foreign.id),
			() => ProductsService.update(session, foreign.id, productBody()),
			() => ProductsService.setArchived(session, foreign.id, true),
		]) {
			await expect(call()).rejects.toMatchObject({
				code: 404,
				response: { code: "product_not_found" },
			});
		}
	});
});

describe("ProductsService.setArchived", () => {
	it("archives and reactivates", async () => {
		const { session } = await signedIn();
		const product = await createProduct(session.store.id);

		const archived = await ProductsService.setArchived(
			session,
			product.id,
			true,
		);
		const back = await ProductsService.setArchived(session, product.id, false);

		expect(archived.archived).toBe(true);
		expect(back.archived).toBe(false);
	});
});

describe("ProductsService.list", () => {
	it("lists the store's active products by name; archived only when asked", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		await createProduct(storeId, { name: "Creme" });
		await createProduct(storeId, { name: "Batom" });
		await createProduct(storeId, { name: "Antigo", archived: true });
		const other = await signedIn();
		await createProduct(other.session.store.id, { name: "Alheio" });

		expect(names(await ProductsService.list(storeId, {}))).toEqual([
			"Batom",
			"Creme",
		]);
		expect(
			names(await ProductsService.list(storeId, { archived: true })),
		).toEqual(["Antigo"]);
	});

	it("searches name and codes, every word, ignoring case and accents", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		await createProduct(storeId, { name: "Perfume Floral 100ml" });
		await createProduct(storeId, {
			name: "Água de Coco",
			internalCode: "AC-7",
		});
		await createProduct(storeId, { name: "Sabonete", barcode: "7891000" });

		const search = async (text: string) =>
			names(await ProductsService.list(storeId, { search: text }));

		expect(await search("floral perfume")).toEqual(["Perfume Floral 100ml"]);
		expect(await search("AGUA")).toEqual(["Água de Coco"]);
		expect(await search("ac-7")).toEqual(["Água de Coco"]);
		expect(await search("7891")).toEqual(["Sabonete"]);
		expect(await search("floral coco")).toEqual([]);
		expect(await search("%")).toEqual([]);
	});

	it("filters by any of the categories", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const a = await createCategory(storeId);
		const b = await createCategory(storeId);
		await createProduct(storeId, { name: "A", categoryId: a.id });
		await createProduct(storeId, { name: "B", categoryId: b.id });
		await createProduct(storeId, { name: "Sem" });

		expect(
			names(await ProductsService.list(storeId, { categoryIds: [a.id] })),
		).toEqual(["A"]);
		expect(
			names(await ProductsService.list(storeId, { categoryIds: [a.id, b.id] })),
		).toEqual(["A", "B"]);
	});

	it("pages through the results", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		for (let i = 0; i <= PAGE_SIZE; i += 1) {
			await createProduct(storeId, { name: `P${String(i).padStart(2, "0")}` });
		}

		const first = await ProductsService.list(storeId, {});
		const second = await ProductsService.list(storeId, {
			cursor: first.nextCursor ?? -1,
		});

		expect(first).toMatchObject({
			total: PAGE_SIZE + 1,
			nextCursor: PAGE_SIZE,
		});
		expect(first.items).toHaveLength(PAGE_SIZE);
		expect(names(second)).toEqual([`P${PAGE_SIZE}`]);
		expect(second.nextCursor).toBeNull();
	});
});
