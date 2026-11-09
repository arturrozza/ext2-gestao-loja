import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../../src/db";
import { audited } from "../../src/db/audit";
import { stockLots, stockMovements } from "../../src/db/schema";
import { storeToday } from "../../src/lib/dates";
import { PAGE_SIZE } from "../../src/lib/pagination";
import { ProductsService } from "../../src/modules/products/products.service";
import { ProductStockService } from "../../src/modules/products/products.stock";
import { useTestDatabase } from "../support/database";
import { signedIn } from "../support/factories/accounts";
import { createProduct } from "../support/factories/catalog";
import { createPurchase, purchaseItem } from "../support/factories/purchases";
import {
	monthFrom,
	setExpiryWarningDays,
	setLotsExpiry,
} from "../support/factories/stock";

useTestDatabase();

/** A stock adjustment through the service, losing units by default. */
function adjust(
	session: Parameters<typeof ProductStockService.adjust>[0],
	productId: string,
	body: Partial<Parameters<typeof ProductStockService.adjust>[2]> & {
		newQuantity: number;
	},
) {
	return ProductStockService.adjust(session, productId, {
		reason: "loss",
		note: null,
		expiry: null,
		...body,
	});
}

const lotsOf = (productId: string) =>
	db
		.select({ expiry: stockLots.expiry, quantity: stockLots.quantity })
		.from(stockLots)
		.where(eq(stockLots.productId, productId))
		.orderBy(stockLots.expiry);

const names = (page: { items: { name: string }[] }) =>
	page.items.map((item) => item.name);

describe("expiry states", () => {
	it("flags and filters products near expiry and expired", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const near = await createProduct(storeId, {
			name: "A perto",
			hasExpiry: true,
		});
		const far = await createProduct(storeId, {
			name: "B longe",
			hasExpiry: true,
		});
		const expired = await createProduct(storeId, {
			name: "C vencido",
			hasExpiry: true,
		});
		await createProduct(storeId, { name: "D sem validade" });
		await createPurchase(session, [
			// This month: its last day is at most 30 days away, within the default warning.
			purchaseItem(near.id, { quantity: 2, expiry: monthFrom(0) }),
			purchaseItem(far.id, { quantity: 2, expiry: monthFrom(12) }),
			purchaseItem(expired.id, { quantity: 2, expiry: monthFrom(0) }),
		]);
		await setLotsExpiry(expired.id, monthFrom(-1));

		const list = (stock: ("near_expiry" | "expired")[]) =>
			ProductsService.list(storeId, { stock }).then(names);

		expect(await list(["near_expiry"])).toEqual(["A perto"]);
		expect(await list(["expired"])).toEqual(["C vencido"]);
		expect(await list(["near_expiry", "expired"])).toEqual([
			"A perto",
			"C vencido",
		]);
		expect((await ProductsService.get(storeId, near.id)).flags).toMatchObject({
			nearExpiry: true,
			expired: false,
		});
		expect(
			(await ProductsService.get(storeId, expired.id)).flags,
		).toMatchObject({ nearExpiry: false, expired: true });
		expect((await ProductsService.get(storeId, far.id)).flags).toMatchObject({
			nearExpiry: false,
			expired: false,
		});
	});

	it("is near expiry from the day the month's last day falls within the warning days", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await createProduct(storeId, { hasExpiry: true });
		await createPurchase(session, [
			purchaseItem(product.id, { expiry: monthFrom(1) }),
		]);
		// Days from today to the last day of next month.
		const today = new Date(`${storeToday()}T00:00:00Z`);
		const dayAfter = new Date(`${monthFrom(2)}-01T00:00:00Z`);
		const days = (dayAfter.getTime() - today.getTime()) / 86_400_000 - 1;
		const nearExpiry = async () =>
			(await ProductsService.get(storeId, product.id)).flags.nearExpiry;

		await setExpiryWarningDays(storeId, days - 1);
		expect(await nearExpiry()).toBe(false);
		await setExpiryWarningDays(storeId, days);
		expect(await nearExpiry()).toBe(true);
	});

	it("follows the store's warning days", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await createProduct(storeId, { hasExpiry: true });
		await createPurchase(session, [
			purchaseItem(product.id, { expiry: monthFrom(12) }),
		]);

		await setExpiryWarningDays(storeId, 400);

		expect(
			(await ProductsService.get(storeId, product.id)).flags.nearExpiry,
		).toBe(true);
	});

	it("marks the expired units in the breakdown", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await createProduct(storeId, { hasExpiry: true });
		await createPurchase(session, [
			purchaseItem(product.id, { expiry: monthFrom(0) }),
		]);
		await setLotsExpiry(product.id, monthFrom(-1));

		expect((await ProductsService.get(storeId, product.id)).expiries).toEqual([
			{ expiry: monthFrom(-1), quantity: 1, expired: true, nearExpiry: false },
		]);
	});
});

describe("quantity by expiry", () => {
	it("adds up the lots of each expiry, soonest first, none last", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await createProduct(storeId, { hasExpiry: true });
		await createPurchase(session, [
			purchaseItem(product.id, { quantity: 5, expiry: monthFrom(12) }),
			purchaseItem(product.id, { quantity: 2, expiry: monthFrom(0) }),
			purchaseItem(product.id, { quantity: 3, expiry: monthFrom(12) }),
		]);

		const { expiries } = await ProductsService.get(storeId, product.id);

		expect(expiries).toEqual([
			{ expiry: monthFrom(0), quantity: 2, expired: false, nearExpiry: true },
			{ expiry: monthFrom(12), quantity: 8, expired: false, nearExpiry: false },
		]);
	});

	it("shows the units without expiry as one line", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await createProduct(storeId);
		await createPurchase(session, [
			purchaseItem(product.id, { quantity: 4 }),
			purchaseItem(product.id, { quantity: 1 }),
		]);

		expect((await ProductsService.get(storeId, product.id)).expiries).toEqual([
			{ expiry: null, quantity: 5, expired: false, nearExpiry: false },
		]);
	});
});

describe("ProductStockService.storeValue", () => {
	it("adds up the stock of every product of the store, archived ones included", async () => {
		const { session } = await signedIn();
		const other = await signedIn();
		const storeId = session.store.id;
		const active = await createProduct(storeId);
		const archived = await createProduct(storeId);
		const elsewhere = await createProduct(other.session.store.id);
		await createPurchase(session, [
			purchaseItem(active.id, { quantity: 10, unitCost: 9200 }),
			purchaseItem(archived.id, { quantity: 1, unitCost: 500 }),
		]);
		await createPurchase(other.session, [
			purchaseItem(elsewhere.id, { quantity: 1, unitCost: 100 }),
		]);
		await ProductsService.setArchived(session, archived.id, true);

		expect(await ProductStockService.storeValue(storeId)).toEqual({
			value: 92_500,
		});
	});

	it("is zero without stock", async () => {
		const { session } = await signedIn();

		expect(await ProductStockService.storeValue(session.store.id)).toEqual({
			value: 0,
		});
	});
});

describe("ProductStockService.movements", () => {
	it("lists the ledger newest first, with its purchase, author and balances", async () => {
		const { session } = await signedIn({ name: "Ana" });
		const storeId = session.store.id;
		const product = await createProduct(storeId);
		const first = await createPurchase(session, [
			purchaseItem(product.id, { quantity: 10, unitCost: 9200 }),
		]);
		const second = await createPurchase(session, [
			purchaseItem(product.id, { quantity: 10, unitCost: 10_000 }),
		]);

		const page = await ProductStockService.movements(storeId, product.id);

		expect(page).toMatchObject({ nextCursor: null, total: 2 });
		expect(page.items).toMatchObject([
			{
				type: "purchase",
				quantity: 10,
				unitCost: 10_000,
				stockAfter: 20,
				averageCostAfter: 9600,
				reason: null,
				note: null,
				origin: { kind: "purchase", id: second.id, number: second.number },
				author: "Ana",
			},
			{
				type: "purchase",
				quantity: 10,
				unitCost: 9200,
				stockAfter: 10,
				averageCostAfter: 9200,
				origin: { kind: "purchase", id: first.id, number: first.number },
			},
		]);
	});

	it("pages the ledger without shifting when a movement comes in between", async () => {
		const { session } = await signedIn();
		const product = await createProduct(session.store.id);
		await createPurchase(
			session,
			Array.from({ length: PAGE_SIZE + 1 }, () => purchaseItem(product.id)),
		);

		const first = await ProductStockService.movements(
			session.store.id,
			product.id,
		);
		await createPurchase(session, [purchaseItem(product.id)]);
		const last = await ProductStockService.movements(
			session.store.id,
			product.id,
			first.nextCursor ?? 0,
		);

		expect(first.nextCursor).not.toBeNull();
		expect(first.items).toHaveLength(PAGE_SIZE);
		expect(first.total).toBe(PAGE_SIZE + 1);
		// The oldest line comes last: the first unit in.
		expect(last.items).toMatchObject([{ stockAfter: 1 }]);
		expect(last.nextCursor).toBeNull();
	});

	it("answers 404 for a product of another store", async () => {
		const { session } = await signedIn();
		const other = await signedIn();
		const product = await createProduct(other.session.store.id);

		const error = await ProductStockService.movements(
			session.store.id,
			product.id,
		).catch((reason) => reason);

		expect(error).toMatchObject({
			code: 404,
			response: { code: "product_not_found" },
		});
	});
});

describe("ProductStockService.adjust", () => {
	it("takes the units from the chosen expiry and records why", async () => {
		const { session } = await signedIn({ name: "Ana" });
		const storeId = session.store.id;
		const product = await createProduct(storeId, { hasExpiry: true });
		await createPurchase(session, [
			purchaseItem(product.id, {
				quantity: 3,
				unitCost: 9200,
				expiry: monthFrom(3),
			}),
			purchaseItem(product.id, {
				quantity: 7,
				unitCost: 9200,
				expiry: monthFrom(8),
			}),
		]);

		const read = await adjust(session, product.id, {
			newQuantity: 8,
			reason: "damage",
			note: "caiu da prateleira",
			fromExpiry: monthFrom(8),
		});
		const [movement] = (
			await ProductStockService.movements(storeId, product.id)
		).items;

		expect(read).toMatchObject({
			stock: 8,
			stockValue: 73_600,
			averageCost: 9200,
		});
		expect(
			read.expiries.map(({ expiry, quantity }) => ({ expiry, quantity })),
		).toEqual([
			{ expiry: monthFrom(3), quantity: 3 },
			{ expiry: monthFrom(8), quantity: 5 },
		]);
		expect(movement).toMatchObject({
			type: "adjustment",
			quantity: -2,
			unitCost: 9200,
			stockAfter: 8,
			reason: "damage",
			note: "caiu da prateleira",
			origin: null,
			author: "Ana",
		});
	});

	it("adds found units as a new lot at the average cost, expired when their month passed", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await createProduct(storeId, { hasExpiry: true });
		await createPurchase(session, [
			purchaseItem(product.id, {
				quantity: 10,
				unitCost: 9200,
				expiry: monthFrom(6),
			}),
		]);

		const read = await adjust(session, product.id, {
			newQuantity: 12,
			reason: "count",
			expiry: monthFrom(-2),
		});

		expect(read).toMatchObject({
			stock: 12,
			sellableStock: 10,
			stockValue: 110_400,
			averageCost: 9200,
			flags: { expired: true },
		});
		expect(await lotsOf(product.id)).toEqual([
			{ expiry: `${monthFrom(-2)}-01`, quantity: 2 },
			{ expiry: `${monthFrom(6)}-01`, quantity: 10 },
		]);
	});

	it("discards the expired units, which then leave the value", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await createProduct(storeId, { hasExpiry: true });
		await createPurchase(session, [
			purchaseItem(product.id, {
				quantity: 4,
				unitCost: 500,
				expiry: monthFrom(0),
			}),
		]);
		await setLotsExpiry(product.id, monthFrom(-1));

		const read = await adjust(session, product.id, {
			newQuantity: 0,
			reason: "expired_discarded",
		});

		expect(read).toMatchObject({
			stock: 0,
			stockValue: 0,
			expiries: [],
			flags: { expired: false, outOfStock: true },
		});
		expect(await lotsOf(product.id)).toEqual([
			{ expiry: `${monthFrom(-1)}-01`, quantity: 0 },
		]);
	});

	it("adjusts an archived product: its units are still there", async () => {
		const { session } = await signedIn();
		const product = await createProduct(session.store.id);
		await createPurchase(session, [purchaseItem(product.id, { quantity: 3 })]);
		await ProductsService.setArchived(session, product.id, true);

		const read = await adjust(session, product.id, {
			newQuantity: 0,
			reason: "gift_internal_use",
		});

		expect(read).toMatchObject({ archived: true, stock: 0, stockValue: 0 });
	});

	it("refuses units without stock and writes nothing", async () => {
		const { session } = await signedIn();
		const product = await createProduct(session.store.id);

		const error = await adjust(session, product.id, {
			newQuantity: 2,
			reason: "count",
		}).catch((reason) => reason);

		expect(error).toMatchObject({
			code: 422,
			response: { code: "no_stock_cost" },
		});
		expect(await lotsOf(product.id)).toEqual([]);
	});

	it("answers 404 for a product of another store", async () => {
		const { session } = await signedIn();
		const other = await signedIn();
		const product = await createProduct(other.session.store.id);

		const error = await adjust(session, product.id, { newQuantity: 0 }).catch(
			(reason) => reason,
		);

		expect(error).toMatchObject({
			code: 404,
			response: { code: "product_not_found" },
		});
	});

	it("never takes the stock below zero with two adjustments at once", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await createProduct(storeId);
		await createPurchase(session, [purchaseItem(product.id, { quantity: 10 })]);

		// Both read 10 and want 5; the second waits for the lock and sees 5: the same quantity, refused.
		const results = await Promise.allSettled([
			adjust(session, product.id, { newQuantity: 5 }),
			adjust(session, product.id, { newQuantity: 5 }),
		]);

		expect(results.map((result) => result.status).sort()).toEqual([
			"fulfilled",
			"rejected",
		]);
		expect((await ProductsService.get(storeId, product.id)).stock).toBe(5);
	});
});

describe("ProductStockService.correctCost", () => {
	it("sets the new average cost on the units in stock, with the note", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await createProduct(storeId);
		await createPurchase(session, [
			purchaseItem(product.id, { quantity: 10, unitCost: 9200 }),
		]);

		const read = await ProductStockService.correctCost(session, product.id, {
			newCost: 8800,
			note: " nota errada ",
		});
		const [movement] = (
			await ProductStockService.movements(storeId, product.id)
		).items;

		expect(read).toMatchObject({
			stock: 10,
			averageCost: 8800,
			stockValue: 88_000,
		});
		expect(movement).toMatchObject({
			type: "cost_correction",
			quantity: 0,
			unitCost: 8800,
			averageCostAfter: 8800,
			stockAfter: 10,
			reason: null,
			note: "nota errada",
		});
	});

	it("is what later units leave at", async () => {
		const { session } = await signedIn();
		const product = await createProduct(session.store.id);
		await createPurchase(session, [
			purchaseItem(product.id, { quantity: 10, unitCost: 9200 }),
		]);
		await ProductStockService.correctCost(session, product.id, {
			newCost: 8800,
			note: "nota errada",
		});

		const read = await adjust(session, product.id, { newQuantity: 9 });

		expect(read.stockValue).toBe(79_200);
	});

	it("refuses without stock", async () => {
		const { session } = await signedIn();
		const product = await createProduct(session.store.id);

		const error = await ProductStockService.correctCost(session, product.id, {
			newCost: 100,
			note: "x",
		}).catch((reason) => reason);

		expect(error).toMatchObject({ code: 422, response: { code: "no_stock" } });
	});
});

describe("stock movements in the database", () => {
	it("needs a reason on an adjustment and refuses one elsewhere", async () => {
		const { session, user } = await signedIn();
		const product = await createProduct(session.store.id);
		const movement = {
			storeId: session.store.id,
			productId: product.id,
			userId: user.id,
			quantity: 0,
			valueChange: 0,
			unitCost: 0,
			stockAfter: 0,
			averageCostAfter: 0,
		};
		const insert = (values: Partial<typeof stockMovements.$inferInsert>) =>
			audited("system", (tx) =>
				tx
					.insert(stockMovements)
					.values({ ...movement, type: "adjustment", ...values }),
			);

		// Postgres names the broken constraint in its message.
		const broken = {
			cause: expect.objectContaining({
				message: expect.stringContaining(
					"stock_movements_reason_on_adjustment",
				),
			}),
		};
		await expect(insert({ reason: null })).rejects.toMatchObject(broken);
		await expect(
			insert({ type: "cost_correction", reason: "loss" }),
		).rejects.toMatchObject(broken);
	});
});
