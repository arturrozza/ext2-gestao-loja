import { describe, expect, it } from "bun:test";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../../src/db";
import { audited } from "../../src/db/audit";
import {
	auditLog,
	purchaseItems,
	purchases,
	stockLots,
	stockMovements,
} from "../../src/db/schema";
import { monthOf } from "../../src/lib/dates";
import { MAX_CENTS } from "../../src/lib/money";
import { PAGE_SIZE } from "../../src/lib/pagination";
import { PurchasesService } from "../../src/modules/purchases/purchases.service";
import { stockBalances } from "../../src/modules/stock/stock.queries";
import { useTestDatabase } from "../support/database";
import { signedIn } from "../support/factories/accounts";
import { createProduct } from "../support/factories/catalog";
import {
	createPurchase,
	purchaseBody,
	purchaseItem,
	storeDayFrom,
} from "../support/factories/purchases";

useTestDatabase();

async function balanceOf(storeId: string, productId: string) {
	return (await stockBalances(db, storeId, [productId])).get(productId);
}

async function movementsOf(productId: string) {
	return db
		.select()
		.from(stockMovements)
		.where(eq(stockMovements.productId, productId))
		.orderBy(asc(stockMovements.seq));
}

async function rowCounts() {
	return {
		purchases: await db.$count(purchases),
		items: await db.$count(purchaseItems),
		lots: await db.$count(stockLots),
		movements: await db.$count(stockMovements),
	};
}

const NOTHING = { purchases: 0, items: 0, lots: 0, movements: 0 };

describe("PurchasesService.create", () => {
	it("averages 10 units at R$ 92 and 10 at R$ 100 to 20 units at R$ 96", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await createProduct(storeId);

		await createPurchase(session, [
			purchaseItem(product.id, { quantity: 10, unitCost: 9200 }),
		]);
		await createPurchase(session, [
			purchaseItem(product.id, { quantity: 10, unitCost: 10_000 }),
		]);

		expect(await balanceOf(storeId, product.id)).toEqual({
			quantity: 20,
			value: 192_000,
		});
		const movements = await movementsOf(product.id);
		expect(
			movements.map(
				({ type, quantity, valueChange, stockAfter, averageCostAfter }) => ({
					type,
					quantity,
					valueChange,
					stockAfter,
					averageCostAfter,
				}),
			),
		).toEqual([
			{
				type: "purchase",
				quantity: 10,
				valueChange: 92_000,
				stockAfter: 10,
				averageCostAfter: 9200,
			},
			{
				type: "purchase",
				quantity: 10,
				valueChange: 100_000,
				stockAfter: 20,
				averageCostAfter: 9600,
			},
		]);
	});

	it("gives each line its own lot and movement, chaining lines of the same product", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await createProduct(storeId, { hasExpiry: true });
		const expiry = monthOf(storeDayFrom(0));

		const purchase = await createPurchase(session, [
			purchaseItem(product.id, { quantity: 3, unitCost: 1000, expiry }),
			purchaseItem(product.id, { quantity: 1, unitCost: 0, expiry }),
		]);

		const lots = await db
			.select()
			.from(stockLots)
			.where(eq(stockLots.productId, product.id));
		const movements = await movementsOf(product.id);
		expect(lots.map((lot) => lot.quantity).sort((a, b) => a - b)).toEqual([
			1, 3,
		]);
		expect(lots.every((lot) => lot.expiry === `${expiry}-01`)).toBe(true);
		expect(lots.map((lot) => lot.purchaseItemId).sort()).toEqual(
			purchase.items.map((item) => item.id).sort(),
		);
		expect(movements.map((m) => [m.stockAfter, m.averageCostAfter])).toEqual([
			[3, 1000],
			[4, 750],
		]);
		expect(movements.every((m) => m.userId === session.user.id)).toBe(true);
	});

	it("returns the purchase with its lines in order, counts and author", async () => {
		const { session, user } = await signedIn();
		const storeId = session.store.id;
		const a = await createProduct(storeId, { name: "Perfume" });
		const b = await createProduct(storeId, { name: "Batom" });

		const purchase = await PurchasesService.create(
			session,
			purchaseBody(
				[
					purchaseItem(a.id, { quantity: 2, unitCost: 5000 }),
					purchaseItem(b.id, { quantity: 1, unitCost: 1999 }),
				],
				{ date: storeDayFrom(-3), note: "  Fornecedor X  " },
			),
		);

		expect(purchase).toMatchObject({
			number: 1,
			date: storeDayFrom(-3),
			status: "active",
			note: "Fornecedor X",
			author: user.name,
			canceledAt: null,
			itemCount: 2,
			unitCount: 3,
			total: 11_999,
			productCount: 2,
		});
		expect(
			purchase.items.map((item) => [item.productName, item.total]),
		).toEqual([
			["Perfume", 10_000],
			["Batom", 1999],
		]);
		expect(purchase.preview.map((preview) => preview.name)).toEqual([
			"Perfume",
			"Batom",
		]);
		expect(await PurchasesService.get(storeId, purchase.id)).toEqual(purchase);
	});

	it("numbers purchases in sequence per store", async () => {
		const a = await signedIn();
		const b = await signedIn();
		const productA = await createProduct(a.session.store.id);
		const productB = await createProduct(b.session.store.id);

		const first = await createPurchase(a.session, [purchaseItem(productA.id)]);
		const second = await createPurchase(a.session, [purchaseItem(productA.id)]);
		const other = await createPurchase(b.session, [purchaseItem(productB.id)]);

		expect([first.number, second.number, other.number]).toEqual([1, 2, 1]);
	});

	it("refuses an archived product, on its line", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const active = await createProduct(storeId);
		const archived = await createProduct(storeId, { archived: true });

		const error = await createPurchase(session, [
			purchaseItem(active.id),
			purchaseItem(archived.id),
		]).catch((reason) => reason);

		expect(error).toMatchObject({
			code: 422,
			response: { code: "product_archived", field: "items.1.productId" },
		});
		expect(await rowCounts()).toEqual(NOTHING);
	});

	it("refuses the whole purchase when a product's stock value would pass what a movement holds", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await createProduct(storeId);
		await createPurchase(session, [
			purchaseItem(product.id, { quantity: 1, unitCost: MAX_CENTS - 10 }),
		]);

		const error = await createPurchase(session, [
			purchaseItem(product.id, { quantity: 1, unitCost: 10 }),
			purchaseItem(product.id, { quantity: 1, unitCost: 1 }),
		]).catch((reason) => reason);

		expect(error).toMatchObject({
			code: 422,
			response: { code: "stock_limit", field: "items.1.quantity" },
		});
		expect(await rowCounts()).toEqual({
			purchases: 1,
			items: 1,
			lots: 1,
			movements: 1,
		});
		expect(await balanceOf(storeId, product.id)).toEqual({
			quantity: 1,
			value: MAX_CENTS - 10,
		});
	});

	it("refuses a product of another store as not found", async () => {
		const { session } = await signedIn();
		const other = await signedIn();
		const foreign = await createProduct(other.session.store.id);

		const error = await createPurchase(session, [
			purchaseItem(foreign.id),
		]).catch((reason) => reason);

		expect(error).toMatchObject({
			code: 422,
			response: { code: "product_not_found", field: "items.0.productId" },
		});
		expect(await rowCounts()).toEqual(NOTHING);
	});

	it("queues two purchases of the same product entered at once", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await createProduct(storeId);

		const results = await Promise.all([
			createPurchase(session, [
				purchaseItem(product.id, { quantity: 10, unitCost: 9200 }),
			]),
			createPurchase(session, [
				purchaseItem(product.id, { quantity: 10, unitCost: 10_000 }),
			]),
		]);

		expect(results.map((purchase) => purchase.number).sort()).toEqual([1, 2]);
		expect(await balanceOf(storeId, product.id)).toEqual({
			quantity: 20,
			value: 192_000,
		});
		const movements = await movementsOf(product.id);
		expect(movements.map((m) => m.stockAfter)).toEqual([10, 20]);
		expect(movements[1]?.averageCostAfter).toBe(9600);
	});

	it("numbers two purchases of different products entered at once", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const a = await createProduct(storeId);
		const b = await createProduct(storeId);

		const results = await Promise.all([
			createPurchase(session, [purchaseItem(a.id)]),
			createPurchase(session, [purchaseItem(b.id)]),
		]);

		expect(results.map((purchase) => purchase.number).sort()).toEqual([1, 2]);
	});

	it("takes the same products in opposite order at once without a deadlock", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const a = await createProduct(storeId);
		const b = await createProduct(storeId);

		await Promise.all([
			createPurchase(session, [purchaseItem(a.id), purchaseItem(b.id)]),
			createPurchase(session, [purchaseItem(b.id), purchaseItem(a.id)]),
		]);

		expect(await balanceOf(storeId, a.id)).toEqual({
			quantity: 2,
			value: 2000,
		});
		expect(await balanceOf(storeId, b.id)).toEqual({
			quantity: 2,
			value: 2000,
		});
	});

	it("takes the cost in the order purchases are entered, whatever their date", async () => {
		const { session } = await signedIn();
		const product = await createProduct(session.store.id);
		await createPurchase(session, [
			purchaseItem(product.id, { quantity: 10, unitCost: 9200 }),
		]);

		await PurchasesService.create(
			session,
			purchaseBody(
				[purchaseItem(product.id, { quantity: 10, unitCost: 10_000 })],
				{ date: storeDayFrom(-30) },
			),
		);

		const movements = await movementsOf(product.id);
		expect(movements.map((m) => [m.stockAfter, m.averageCostAfter])).toEqual([
			[10, 9200],
			[20, 9600],
		]);
	});

	it("keeps the quantity of the lots equal to the units of the movements", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const a = await createProduct(storeId);
		const b = await createProduct(storeId);

		await createPurchase(session, [
			purchaseItem(a.id, { quantity: 7 }),
			purchaseItem(b.id, { quantity: 2 }),
			purchaseItem(a.id, { quantity: 5 }),
		]);

		const [fromLots] = await db
			.select({ total: sql`sum(${stockLots.quantity})`.mapWith(Number) })
			.from(stockLots);
		const [fromMovements] = await db
			.select({ total: sql`sum(${stockMovements.quantity})`.mapWith(Number) })
			.from(stockMovements);
		expect(fromLots?.total).toBe(14);
		expect(fromMovements?.total).toBe(14);
	});

	it("logs the purchase in the audit log with its author", async () => {
		const { session } = await signedIn();
		const product = await createProduct(session.store.id);

		await createPurchase(session, [purchaseItem(product.id)]);

		const logged = await db
			.select({ table: auditLog.tableName, userId: auditLog.userId })
			.from(auditLog)
			.where(
				and(
					eq(auditLog.storeId, session.store.id),
					eq(auditLog.action, "insert"),
				),
			);
		const tables = logged
			.filter((row) => row.userId === session.user.id)
			.map((row) => row.table);
		expect(tables).toEqual(
			expect.arrayContaining([
				"purchases",
				"purchase_items",
				"stock_lots",
				"stock_movements",
			]),
		);
	});
});

describe("PurchasesService.list", () => {
	it("lists the store's purchases newest first, with counts and thumbs", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const a = await createProduct(storeId, { name: "Perfume" });
		const b = await createProduct(storeId, { name: "Batom" });
		const other = await signedIn();
		const foreign = await createProduct(other.session.store.id);
		await createPurchase(other.session, [purchaseItem(foreign.id)]);

		const first = await createPurchase(session, [
			purchaseItem(a.id, { quantity: 2, unitCost: 500 }),
		]);
		const second = await createPurchase(session, [
			purchaseItem(b.id, { quantity: 1, unitCost: 300 }),
			purchaseItem(a.id, { quantity: 3, unitCost: 100 }),
		]);

		const page = await PurchasesService.list(storeId, {});

		expect(page).toMatchObject({ total: 2, nextCursor: null });
		expect(page.items.map((purchase) => purchase.id)).toEqual([
			second.id,
			first.id,
		]);
		expect(page.items[0]).toEqual({
			id: second.id,
			number: 2,
			date: second.date,
			status: "active",
			itemCount: 2,
			unitCount: 4,
			total: 600,
			productCount: 2,
			preview: [
				{ productId: b.id, name: "Batom", photoUrl: null },
				{ productId: a.id, name: "Perfume", photoUrl: null },
			],
		});
	});

	it("pages the history, with the total of every page", async () => {
		const { session } = await signedIn();
		const product = await createProduct(session.store.id);
		for (let i = 0; i <= PAGE_SIZE; i += 1) {
			await createPurchase(session, [purchaseItem(product.id)]);
		}

		const first = await PurchasesService.list(session.store.id, {});
		const last = await PurchasesService.list(session.store.id, {
			cursor: first.nextCursor ?? 0,
		});

		expect(first.items).toHaveLength(PAGE_SIZE);
		expect(first.items[0]?.number).toBe(PAGE_SIZE + 1);
		expect(first.total).toBe(PAGE_SIZE + 1);
		expect(last.items.map((purchase) => purchase.number)).toEqual([1]);
		expect(last.nextCursor).toBeNull();
	});

	it("filters active or canceled purchases", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await createProduct(storeId);
		const kept = await createPurchase(session, [purchaseItem(product.id)]);
		const canceled = await createPurchase(session, [purchaseItem(product.id)]);
		// Cancellation is MUN-17; until then only a direct write marks one.
		await audited("system", (tx) =>
			tx
				.update(purchases)
				.set({ canceledAt: new Date() })
				.where(eq(purchases.id, canceled.id)),
		);

		const ids = async (status?: "active" | "canceled") => {
			const page = await PurchasesService.list(storeId, { status });
			expect(page.total).toBe(page.items.length);
			return page.items.map((purchase) => purchase.id);
		};

		expect(await ids("active")).toEqual([kept.id]);
		expect(await ids("canceled")).toEqual([canceled.id]);
		expect(await ids()).toEqual([canceled.id, kept.id]);
		expect((await PurchasesService.get(storeId, canceled.id)).status).toBe(
			"canceled",
		);
	});

	it("is empty for a store without purchases", async () => {
		const { session } = await signedIn();

		expect(await PurchasesService.list(session.store.id, {})).toEqual({
			items: [],
			nextCursor: null,
			total: 0,
		});
	});
});

describe("PurchasesService.get", () => {
	it("answers 404 for a purchase of another store", async () => {
		const { session } = await signedIn();
		const other = await signedIn();
		const product = await createProduct(other.session.store.id);
		const foreign = await createPurchase(other.session, [
			purchaseItem(product.id),
		]);

		const error = await PurchasesService.get(
			session.store.id,
			foreign.id,
		).catch((reason) => reason);

		expect(error).toMatchObject({
			code: 404,
			response: { code: "purchase_not_found" },
		});
	});
});

describe("stockBalances", () => {
	it("reads only the store's products, zero for one without stock", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const stocked = await createProduct(storeId);
		const empty = await createProduct(storeId);
		const other = await signedIn();
		const foreign = await createProduct(other.session.store.id);
		await createPurchase(session, [
			purchaseItem(stocked.id, { quantity: 2, unitCost: 150 }),
		]);
		await createPurchase(other.session, [purchaseItem(foreign.id)]);

		const balances = await stockBalances(db, storeId, [
			stocked.id,
			empty.id,
			foreign.id,
		]);

		expect(Object.fromEntries(balances)).toEqual({
			[stocked.id]: { quantity: 2, value: 300 },
			[empty.id]: { quantity: 0, value: 0 },
		});
	});
});

describe("stock ledger", () => {
	it("never lets a movement be changed or deleted", async () => {
		const { session } = await signedIn();
		const product = await createProduct(session.store.id);
		await createPurchase(session, [purchaseItem(product.id)]);

		const appendOnly = {
			cause: { message: expect.stringContaining("append-only") },
		};
		await expect(
			audited("system", (tx) =>
				tx.update(stockMovements).set({ quantity: 99 }),
			),
		).rejects.toMatchObject(appendOnly);
		await expect(
			audited("system", (tx) => tx.delete(stockMovements)),
		).rejects.toMatchObject(appendOnly);
		expect((await movementsOf(product.id))[0]?.quantity).toBe(1);
	});
});
