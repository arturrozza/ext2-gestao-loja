import { describe, expect, it } from "bun:test";
import { asc, eq } from "drizzle-orm";
import { db } from "../../src/db";
import {
	saleCosts,
	saleItemLots,
	saleItems,
	sales,
	stockLots,
	stockMovements,
} from "../../src/db/schema";
import { ProductStockService } from "../../src/modules/products/products.stock";
import { SalesService } from "../../src/modules/sales/sales.service";
import { stockBalances } from "../../src/modules/stock/stock.queries";
import { useTestDatabase } from "../support/database";
import { signedIn } from "../support/factories/accounts";
import { createProduct } from "../support/factories/catalog";
import { createCustomer } from "../support/factories/customers";
import {
	createPurchase,
	purchaseItem,
	storeDayFrom,
} from "../support/factories/purchases";
import { createReseller } from "../support/factories/resellers";
import {
	createSale,
	markCanceled,
	saleBody,
	saleItem,
} from "../support/factories/sales";
import { monthFrom, setLotsExpiry } from "../support/factories/stock";

useTestDatabase();

async function balanceOf(storeId: string, productId: string) {
	return (await stockBalances(db, storeId, [productId])).get(productId);
}

async function rowCounts() {
	return {
		sales: await db.$count(sales),
		items: await db.$count(saleItems),
		costs: await db.$count(saleCosts),
		lots: await db.$count(saleItemLots),
		exits: await db.$count(stockMovements, eq(stockMovements.type, "sale")),
	};
}

const NOTHING = { sales: 0, items: 0, costs: 0, lots: 0, exits: 0 };

/** A signed-in store with a product of `quantity` units bought at `unitCost`. */
async function stocked(quantity = 10, unitCost = 4000) {
	const signed = await signedIn();
	const product = await createProduct(signed.session.store.id, {
		name: "Perfume",
	});
	await createPurchase(signed.session, [
		purchaseItem(product.id, { quantity, unitCost }),
	]);
	return { ...signed, storeId: signed.session.store.id, product };
}

describe("SalesService.create", () => {
	it("2 × R$ 100, R$ 20 off, cost R$ 40, R$ 15 freight and a 10% fee: R$ 180 revenue, R$ 67 profit, kept", async () => {
		const { session, user, storeId, product } = await stocked();

		const sale = await createSale(
			session,
			[saleItem(product.id, { quantity: 2, unitPrice: 10_000 })],
			{
				discount: 2000,
				costs: [
					{ kind: "freight", mode: "amount", value: 1500, label: null },
					{ kind: "platform_fee", mode: "percent", value: 1000, label: " " },
				],
			},
		);

		expect(sale).toMatchObject({
			number: 1,
			status: "active",
			revenue: 18_000,
			productsCost: 8000,
			saleCosts: 3300,
			profit: 6700,
			author: user.name,
			canceledAt: null,
			cancelReason: null,
			productCount: 1,
			items: [
				{
					productName: "Perfume",
					quantity: 2,
					unitPrice: 10_000,
					unitCost: 4000,
					total: 20_000,
				},
			],
			costs: [
				{
					kind: "freight",
					mode: "amount",
					value: 1500,
					amount: 1500,
					label: null,
				},
				{
					kind: "platform_fee",
					mode: "percent",
					value: 1000,
					amount: 1800,
					label: null,
				},
			],
		});
		expect(sale.margin).toBeCloseTo(6700 / 18_000, 10);
		expect(await SalesService.get(storeId, sale.id)).toEqual(sale);
		expect(await balanceOf(storeId, product.id)).toEqual({
			quantity: 8,
			value: 32_000,
		});
	});

	it("keeps the profit when a later purchase changes the average cost", async () => {
		const { session, storeId, product } = await stocked();
		const sale = await createSale(session, [saleItem(product.id)]);

		await createPurchase(session, [
			purchaseItem(product.id, { quantity: 10, unitCost: 8000 }),
		]);

		expect(await SalesService.get(storeId, sale.id)).toMatchObject({
			profit: 6000,
			productsCost: 4000,
			items: [{ unitCost: 4000 }],
		});
	});

	it("takes the soonest expiry first, the lots without expiry last, and never an expired one", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await createProduct(storeId, { hasExpiry: true });
		await createPurchase(session, [
			purchaseItem(product.id, { quantity: 3, expiry: monthFrom(0) }),
		]);
		await setLotsExpiry(product.id, monthFrom(-1));
		await createPurchase(session, [
			purchaseItem(product.id, { quantity: 2, expiry: monthFrom(6) }),
			purchaseItem(product.id, { quantity: 2, expiry: monthFrom(2) }),
		]);

		const sale = await createSale(session, [
			saleItem(product.id, { quantity: 3 }),
		]);

		const lots = await db
			.select({ expiry: stockLots.expiry, quantity: stockLots.quantity })
			.from(stockLots)
			.where(eq(stockLots.productId, product.id))
			.orderBy(asc(stockLots.expiry));
		expect(lots).toEqual([
			{ expiry: `${monthFrom(-1)}-01`, quantity: 3 },
			{ expiry: `${monthFrom(2)}-01`, quantity: 0 },
			{ expiry: `${monthFrom(6)}-01`, quantity: 1 },
		]);
		const taken = await db
			.select({ quantity: saleItemLots.quantity })
			.from(saleItemLots)
			.innerJoin(saleItems, eq(saleItems.id, saleItemLots.saleItemId))
			.where(eq(saleItems.saleId, sale.id));
		expect(taken.map((row) => row.quantity).sort()).toEqual([1, 2]);
	});

	it("blocks a line past the sellable stock, expired units not counted, and writes nothing", async () => {
		const { session, storeId, product } = await stocked(5);
		await setLotsExpiry(product.id, monthFrom(-1));
		await createPurchase(session, [purchaseItem(product.id, { quantity: 2 })]);
		const other = await createProduct(storeId);
		await createPurchase(session, [purchaseItem(other.id, { quantity: 5 })]);

		const error = await createSale(session, [
			saleItem(other.id),
			saleItem(product.id, { quantity: 3 }),
		]).catch((reason) => reason);

		expect(error).toMatchObject({
			code: 422,
			response: {
				code: "insufficient_stock",
				message: "Estoque insuficiente: disponível 2.",
				field: "items.1.quantity",
			},
		});
		expect(await rowCounts()).toEqual(NOTHING);
		expect((await balanceOf(storeId, other.id))?.quantity).toBe(5);
	});

	it("takes the whole value with the last unit", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await createProduct(storeId);
		// R$ 10 in 3 units: R$ 3,33 each, but 3 × R$ 3,33 would leave a cent behind.
		await createPurchase(session, [
			purchaseItem(product.id, { quantity: 2, unitCost: 333 }),
			purchaseItem(product.id, { quantity: 1, unitCost: 334 }),
		]);

		const sale = await createSale(session, [
			saleItem(product.id, { quantity: 3, unitPrice: 1000 }),
		]);

		expect(sale.productsCost).toBe(1000);
		expect(await balanceOf(storeId, product.id)).toEqual({
			quantity: 0,
			value: 0,
		});
	});

	it("records the exit in the product's history, with the sale as its origin", async () => {
		const { session, storeId, product } = await stocked();

		const sale = await createSale(session, [
			saleItem(product.id, { quantity: 3 }),
		]);

		const history = await ProductStockService.movements(storeId, product.id);
		expect(history.items[0]).toMatchObject({
			type: "sale",
			quantity: -3,
			unitCost: 4000,
			stockAfter: 7,
			averageCostAfter: 4000,
			origin: { kind: "sale", id: sale.id, number: 1 },
		});
	});

	it("numbers sales in sequence per store", async () => {
		const a = await stocked();
		const b = await stocked();

		const first = await createSale(a.session, [saleItem(a.product.id)]);
		const second = await createSale(a.session, [saleItem(a.product.id)]);
		const other = await createSale(b.session, [saleItem(b.product.id)]);

		expect([first.number, second.number, other.number]).toEqual([1, 2, 1]);
	});

	it("sells the last units once when two sales take them at the same time", async () => {
		const { session, storeId, product } = await stocked(3);

		const results = await Promise.allSettled([
			createSale(session, [saleItem(product.id, { quantity: 2 })]),
			createSale(session, [saleItem(product.id, { quantity: 2 })]),
		]);

		expect(results.map((result) => result.status).sort()).toEqual([
			"fulfilled",
			"rejected",
		]);
		expect((await balanceOf(storeId, product.id))?.quantity).toBe(1);
	});

	it("keeps the reseller, her commission and the customer", async () => {
		const { session, storeId, product } = await stocked();
		const reseller = await createReseller(storeId, { name: "Ana" });
		const customer = await createCustomer(storeId, { name: "Bia" });

		const sale = await createSale(session, [saleItem(product.id)], {
			channel: "reseller",
			resellerId: reseller.id,
			customerId: customer.id,
			costs: [
				{ kind: "commission", mode: "percent", value: 1000, label: null },
			],
		});

		expect(sale).toMatchObject({
			channel: "reseller",
			resellerId: reseller.id,
			resellerName: "Ana",
			customerId: customer.id,
			customerName: "Bia",
			costs: [{ kind: "commission", amount: 1000 }],
		});
	});

	it("refuses an archived reseller or customer, and those of another store", async () => {
		const { session, storeId, product } = await stocked();
		const archived = await createReseller(storeId, { archived: true });
		const elsewhere = await createCustomer((await signedIn()).session.store.id);

		const archivedError = await createSale(session, [saleItem(product.id)], {
			channel: "reseller",
			resellerId: archived.id,
		}).catch((reason) => reason);
		const otherStoreError = await createSale(session, [saleItem(product.id)], {
			customerId: elsewhere.id,
		}).catch((reason) => reason);

		expect(archivedError).toMatchObject({
			response: { code: "reseller_archived", field: "resellerId" },
		});
		expect(otherStoreError).toMatchObject({
			response: { code: "customer_not_found", field: "customerId" },
		});
		expect(await rowCounts()).toEqual(NOTHING);
	});

	it("refuses a product of another store and an archived one", async () => {
		const { session, product } = await stocked();
		const other = await stocked();
		const archived = await createProduct(session.store.id, { archived: true });

		const foreign = await createSale(session, [
			saleItem(product.id),
			saleItem(other.product.id),
		]).catch((reason) => reason);
		const gone = await createSale(session, [saleItem(archived.id)]).catch(
			(reason) => reason,
		);

		expect(foreign).toMatchObject({
			response: { code: "product_not_found", field: "items.1.productId" },
		});
		expect(gone).toMatchObject({ response: { code: "product_archived" } });
	});

	it("takes a day in the past, with the cost of now", async () => {
		const { session, product } = await stocked();

		const sale = await SalesService.create(
			session,
			saleBody([saleItem(product.id)], { date: storeDayFrom(-10) }),
		);

		expect(sale).toMatchObject({ date: storeDayFrom(-10), productsCost: 4000 });
	});

	it("answers 404 for a sale of another store", async () => {
		const { session, product } = await stocked();
		const sale = await createSale(session, [saleItem(product.id)]);
		const other = await signedIn();

		const error = await SalesService.get(other.session.store.id, sale.id).catch(
			(reason) => reason,
		);

		expect(error).toMatchObject({
			code: 404,
			response: { code: "sale_not_found" },
		});
	});
});

describe("SalesService.list", () => {
	it("lists the newest day first, canceled ones marked and out of the totals", async () => {
		const { session, storeId, product } = await stocked();
		const first = await createSale(session, [saleItem(product.id)]);
		const second = await createSale(session, [
			saleItem(product.id, { quantity: 2, unitPrice: 3000 }),
		]);
		// Entered last, but of an earlier day: it lists after the others.
		await createSale(session, [saleItem(product.id)], {
			date: storeDayFrom(-2),
		});
		await markCanceled(first.id);

		const page = await SalesService.list(storeId, {});

		expect(page.items.map((sale) => [sale.number, sale.status])).toEqual([
			[2, "active"],
			[1, "canceled"],
			[3, "active"],
		]);
		expect(page.items[0]).toMatchObject({
			id: second.id,
			revenue: 6000,
			profit: -2000,
			productCount: 1,
			preview: [{ productId: product.id, name: "Perfume" }],
		});
		expect(page).toMatchObject({
			total: 3,
			nextCursor: null,
			totals: { revenue: 16_000, profit: 4000, count: 2 },
		});
	});

	it("filters by period, channel, result, customer and reseller", async () => {
		const { session, storeId, product } = await stocked(20);
		const reseller = await createReseller(storeId);
		const customer = await createCustomer(storeId);
		const line = saleItem(product.id);
		const lastWeek = await createSale(session, [line], {
			date: storeDayFrom(-7),
		});
		const sixDaysAgo = await createSale(session, [line], {
			date: storeDayFrom(-6),
		});
		const loss = await createSale(session, [
			saleItem(product.id, { unitPrice: 1000 }),
		]);
		const byReseller = await createSale(session, [line], {
			channel: "reseller",
			resellerId: reseller.id,
		});
		const withCustomer = await createSale(session, [line], {
			channel: "mercado_livre",
			customerId: customer.id,
		});
		const ids = async (query: Parameters<typeof SalesService.list>[1]) =>
			(await SalesService.list(storeId, query)).items.map((sale) => sale.id);

		expect(await ids({ period: "today" })).toEqual([
			withCustomer.id,
			byReseller.id,
			loss.id,
		]);
		// The last 7 days, today included: 6 days ago is in, 7 days ago isn't.
		expect(await ids({ period: "7d" })).toContain(sixDaysAgo.id);
		expect(await ids({ period: "7d" })).not.toContain(lastWeek.id);
		expect(await ids({ period: "all" })).toHaveLength(5);
		expect(await ids({ channels: ["reseller", "mercado_livre"] })).toEqual([
			withCustomer.id,
			byReseller.id,
		]);
		expect(await ids({ result: "loss" })).toEqual([loss.id]);
		expect(await ids({ result: "profit" })).toHaveLength(4);
		expect(await ids({ resellerId: reseller.id })).toEqual([byReseller.id]);
		expect(await ids({ customerId: customer.id })).toEqual([withCustomer.id]);
		// The totals follow the filter: only the reseller's sale.
		expect(
			(await SalesService.list(storeId, { channels: ["reseller"] })).totals,
		).toEqual({ revenue: 10_000, profit: 6000, count: 1 });
	});

	it("lists only the store's sales", async () => {
		const mine = await stocked();
		const other = await stocked();
		await createSale(other.session, [saleItem(other.product.id)]);

		const page = await SalesService.list(mine.storeId, {});

		expect(page).toMatchObject({
			total: 0,
			items: [],
			totals: { revenue: 0, profit: 0, count: 0 },
		});
	});
});
