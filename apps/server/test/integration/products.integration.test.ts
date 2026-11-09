import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import { db } from "../../src/db";
import { audited } from "../../src/db/audit";
import { auditLog, products, stockLots } from "../../src/db/schema";
import { expiryToDate, monthOf, storeToday } from "../../src/lib/dates";
import { MAX_CENTS } from "../../src/lib/money";
import { PAGE_SIZE } from "../../src/lib/pagination";
import { CategoriesService } from "../../src/modules/categories/categories.service";
import { newPhotoKey } from "../../src/modules/products/products.photo";
import { ProductsService } from "../../src/modules/products/products.service";
import { useTestDatabase } from "../support/database";
import { signedIn } from "../support/factories/accounts";
import {
	createCategory,
	createProduct,
	productBody,
} from "../support/factories/catalog";
import { createPurchase, purchaseItem } from "../support/factories/purchases";
import {
	jpegBytes,
	jpegFile,
	useFakePhotoStorage,
} from "../support/photo-storage";

useTestDatabase();
const bucket = useFakePhotoStorage();

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
				basePrice: 9250,
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
			basePrice: 9250,
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

describe("product base price in the database", () => {
	it("keeps the cents exactly as sent, up to the integer limit", async () => {
		const { session } = await signedIn();

		for (const basePrice of [1, 9255, MAX_CENTS]) {
			const created = await ProductsService.create(
				session,
				productBody({ basePrice }),
			);
			const read = await ProductsService.get(session.store.id, created.id);
			expect([created.basePrice, read.basePrice]).toEqual([
				basePrice,
				basePrice,
			]);
		}
	});

	it("refuses a price that isn't above zero even past the API", async () => {
		const { session } = await signedIn();

		for (const basePrice of [0, -1]) {
			await expect(
				audited("system", (tx) =>
					tx.insert(products).values({
						storeId: session.store.id,
						name: "Perfume",
						basePrice,
						searchText: "perfume",
					}),
				),
			).rejects.toMatchObject({
				// Postgres names the broken constraint in its message.
				cause: expect.objectContaining({
					message: expect.stringContaining("products_base_price_positive"),
				}),
			});
		}
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
			productBody({ name: "Novo", basePrice: 1500 }),
		);

		expect(updated).toMatchObject({ name: "Novo", basePrice: 1500 });
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

describe("ProductsService photos", () => {
	/** A photo the API already stored for the store (what `uploadPhoto` leaves behind). */
	function stored(storeId: string) {
		const key = newPhotoKey(storeId);
		bucket.put(key);
		return key;
	}

	it("stores a sent JPEG under a new key in the store's folder, as image/jpeg", async () => {
		const { session } = await signedIn();
		const bytes = jpegBytes(300);

		const { key } = await ProductsService.uploadPhoto(session, jpegFile(bytes));

		expect(key).toStartWith(`stores/${session.store.id}/products/`);
		expect(bucket.objects.get(key)).toEqual({ bytes, type: "image/jpeg" });
	});

	it("stores nothing for a file that isn't a JPEG", async () => {
		const { session } = await signedIn();
		const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "x.jpg", {
			type: "image/jpeg",
		});

		await expect(
			ProductsService.uploadPhoto(session, png),
		).rejects.toMatchObject({
			code: 422,
			response: { code: "photo_invalid", field: "photo" },
		});
		expect(bucket.objects.size).toBe(0);
	});

	it("saves a product with a stored photo and returns its public URL", async () => {
		const { session } = await signedIn();
		const key = stored(session.store.id);

		const product = await ProductsService.create(
			session,
			productBody({ photoKey: key }),
		);
		const read = await ProductsService.get(session.store.id, product.id);

		expect(product.photoUrl).toBe(`https://photos.test/${key}`);
		expect(read.photoUrl).toBe(product.photoUrl);
	});

	it("keeps the photo when the edit leaves it out, swaps it for a new key and removes it with null", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const first = stored(storeId);
		const second = stored(storeId);
		const product = await createProduct(storeId, { photoKey: first });
		const body = productBody();

		const kept = await ProductsService.update(session, product.id, body);
		const swapped = await ProductsService.update(session, product.id, {
			...body,
			photoKey: second,
		});
		const removed = await ProductsService.update(session, product.id, {
			...body,
			photoKey: null,
		});

		expect(kept.photoUrl).toBe(`https://photos.test/${first}`);
		expect(swapped.photoUrl).toBe(`https://photos.test/${second}`);
		expect(removed.photoUrl).toBeNull();
	});

	it("refuses a photo that was never stored or is another store's, and saves nothing", async () => {
		const { session } = await signedIn();
		const other = await signedIn();
		const storeId = session.store.id;

		await expect(
			ProductsService.create(
				session,
				productBody({ photoKey: newPhotoKey(storeId) }),
			),
		).rejects.toMatchObject({
			code: 422,
			response: { code: "photo_not_found", field: "photoKey" },
		});
		await expect(
			ProductsService.create(
				session,
				productBody({ photoKey: stored(other.session.store.id) }),
			),
		).rejects.toMatchObject({
			code: 422,
			response: { code: "photo_key_invalid", field: "photoKey" },
		});
		expect((await ProductsService.list(storeId, {})).total).toBe(0);
	});

	it("logs the photo change in the audit log, with the old key", async () => {
		const { session } = await signedIn();
		const first = stored(session.store.id);
		const second = stored(session.store.id);
		const product = await createProduct(session.store.id, { photoKey: first });

		await ProductsService.update(session, product.id, {
			...productBody(),
			photoKey: second,
		});

		const [entry] = await db
			.select()
			.from(auditLog)
			.where(
				and(eq(auditLog.recordId, product.id), eq(auditLog.action, "update")),
			);
		expect(entry?.changedFields).toContain("photo_key");
		expect(entry?.oldValues).toMatchObject({ photo_key: first });
		expect(entry?.newValues).toMatchObject({ photo_key: second });
	});

	it("keeps the saved photo when an edit brings a bad one, or the bucket is down", async () => {
		const { session } = await signedIn();
		const key = stored(session.store.id);
		const product = await createProduct(session.store.id, { photoKey: key });

		await expect(
			ProductsService.update(session, product.id, {
				...productBody(),
				photoKey: newPhotoKey(session.store.id),
			}),
		).rejects.toMatchObject({ response: { code: "photo_not_found" } });
		bucket.failing(true);
		await expect(
			ProductsService.update(session, product.id, {
				...productBody(),
				photoKey: stored(session.store.id),
			}),
		).rejects.toMatchObject({ code: 503 });
		bucket.failing(false);
		const read = await ProductsService.get(session.store.id, product.id);
		expect(read.photoUrl).toBe(`https://photos.test/${key}`);
	});

	it("answers for an unknown or archived product before looking at the photo", async () => {
		const { session } = await signedIn();
		const archived = await createProduct(session.store.id, { archived: true });
		const body = productBody({ photoKey: newPhotoKey(session.store.id) });

		await expect(
			ProductsService.update(session, crypto.randomUUID(), body),
		).rejects.toMatchObject({ code: 404 });
		await expect(
			ProductsService.update(session, archived.id, body),
		).rejects.toMatchObject({ response: { code: "product_archived" } });
	});

	it("answers 503 for a photo while photos are off, hides saved photos, and still saves products without one", async () => {
		const { session } = await signedIn();
		const withPhoto = await createProduct(session.store.id, {
			photoKey: stored(session.store.id),
		});
		bucket.off();

		await expect(
			ProductsService.uploadPhoto(session, jpegFile()),
		).rejects.toMatchObject({
			code: 503,
			response: { code: "photos_unavailable" },
		});
		await expect(
			ProductsService.create(
				session,
				productBody({ photoKey: newPhotoKey(session.store.id) }),
			),
		).rejects.toMatchObject({ code: 503 });
		const plain = await ProductsService.create(session, productBody());
		const hidden = await ProductsService.get(session.store.id, withPhoto.id);
		expect(plain.photoUrl).toBeNull();
		expect(hidden.photoUrl).toBeNull();
	});
});

/** A day of the store's previous month. */
function lastMonthDay() {
	const [year = 0, month = 0] = storeToday().split("-").map(Number);
	return new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10);
}

describe("product stock", () => {
	/** Moves a lot's expiry, to have expired units (a purchase never takes them). */
	async function expireLotsOf(productId: string, expiry: string) {
		await audited("system", (tx) =>
			tx
				.update(stockLots)
				.set({ expiry })
				.where(eq(stockLots.productId, productId)),
		);
	}

	it("starts at zero, out of stock", async () => {
		const { session } = await signedIn();

		const product = await ProductsService.create(session, productBody());

		expect(product).toMatchObject({
			stock: 0,
			sellableStock: 0,
			averageCost: 0,
			stockValue: 0,
			flags: { lowStock: false, outOfStock: true },
		});
	});

	it("shows the stock and the average cost the purchases left, in the list and the product", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await createProduct(storeId, { minStock: 20 });
		await createPurchase(session, [
			purchaseItem(product.id, { quantity: 10, unitCost: 9200 }),
			purchaseItem(product.id, { quantity: 10, unitCost: 10_000 }),
		]);

		const read = await ProductsService.get(storeId, product.id);
		const [listed] = (await ProductsService.list(storeId, {})).items;

		expect(read).toMatchObject({
			stock: 20,
			sellableStock: 20,
			averageCost: 9600,
			stockValue: 192_000,
			flags: { lowStock: true, outOfStock: false },
		});
		expect(listed).toEqual(read);
	});

	it("rounds the average cost only for showing", async () => {
		const { session } = await signedIn();
		const product = await createProduct(session.store.id);
		await createPurchase(session, [
			purchaseItem(product.id, { quantity: 3, unitCost: 0 }),
			purchaseItem(product.id, { quantity: 3, unitCost: 667 }),
		]);

		const read = await ProductsService.get(session.store.id, product.id);

		expect(read).toMatchObject({ stockValue: 2001, averageCost: 334 });
	});

	it("leaves expired units out of what can be sold, keeping the ones of this month", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const expired = await createProduct(storeId, { hasExpiry: true });
		const thisMonth = await createProduct(storeId, { hasExpiry: true });
		const month = monthOf(storeToday());
		await createPurchase(session, [
			purchaseItem(expired.id, { quantity: 4, expiry: month }),
			purchaseItem(thisMonth.id, { quantity: 2, expiry: month }),
		]);
		// Last month: expired since the last day of that month.
		await expireLotsOf(expired.id, expiryToDate(monthOf(lastMonthDay())));

		expect(await ProductsService.get(storeId, expired.id)).toMatchObject({
			stock: 4,
			sellableStock: 0,
		});
		expect(await ProductsService.get(storeId, thisMonth.id)).toMatchObject({
			stock: 2,
			sellableStock: 2,
		});
	});

	it("filters by any of the stock states", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const plenty = await createProduct(storeId, { name: "A farto" });
		const low = await createProduct(storeId, { name: "B baixo", minStock: 5 });
		await createProduct(storeId, { name: "C zerado", minStock: 5 });
		const expired = await createProduct(storeId, {
			name: "D vencido",
			hasExpiry: true,
			minStock: 20,
		});
		await createPurchase(session, [
			purchaseItem(plenty.id, { quantity: 50 }),
			purchaseItem(low.id, { quantity: 5 }),
			purchaseItem(expired.id, {
				quantity: 9,
				expiry: monthOf(storeToday()),
			}),
		]);
		await expireLotsOf(expired.id, "2000-01-01");

		const list = async (stock: ("in_stock" | "low" | "out")[]) =>
			names(await ProductsService.list(storeId, { stock }));

		expect(await list(["in_stock"])).toEqual(["A farto", "B baixo"]);
		// Expired units still count until discarded: "D vencido" is low by its minimum, never "in_stock".
		expect(await list(["low"])).toEqual(["B baixo", "D vencido"]);
		expect(await list(["out"])).toEqual(["C zerado"]);
		expect(await list(["low", "out"])).toEqual([
			"B baixo",
			"C zerado",
			"D vencido",
		]);
		expect(await list([])).toHaveLength(4);
	});

	it("filters exactly the products whose flags say so", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const rows: [quantity: number, minStock: number | null][] = [
			[0, 5],
			[4, 5],
			[5, 5],
			[6, 5],
			[1, null],
			[0, null],
		];
		for (const [index, [quantity, minStock]] of rows.entries()) {
			const product = await createProduct(storeId, {
				name: `P${index}`,
				minStock,
			});
			if (quantity > 0) {
				await createPurchase(session, [purchaseItem(product.id, { quantity })]);
			}
		}

		const all = (await ProductsService.list(storeId, {})).items;
		expect(all.filter((p) => p.flags.lowStock).map((p) => p.name)).toEqual([
			"P1",
			"P2",
		]);
		const listed = async (state: "in_stock" | "low" | "out") =>
			names(await ProductsService.list(storeId, { stock: [state] }));

		expect(await listed("low")).toEqual(
			all.filter((p) => p.flags.lowStock).map((p) => p.name),
		);
		expect(await listed("out")).toEqual(
			all.filter((p) => p.flags.outOfStock).map((p) => p.name),
		);
		expect(await listed("in_stock")).toEqual(
			all.filter((p) => p.sellableStock > 0).map((p) => p.name),
		);
	});
});
