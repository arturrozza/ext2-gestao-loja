import { describe, expect, it } from "bun:test";
import { asc, eq } from "drizzle-orm";
import { db } from "../../src/db";
import {
	auditLog,
	saleCosts,
	saleItemLots,
	saleItems,
	sales,
	stockLots,
	stockMovements,
} from "../../src/db/schema";
import { MAX_CENTS } from "../../src/lib/money";
import { ProductStockService } from "../../src/modules/products/products.stock";
import { PurchasesService } from "../../src/modules/purchases/purchases.service";
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
	cancelSale,
	createSale,
	saleBody,
	saleItem,
	termSale,
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
		await cancelSale(session, first.id);

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

describe("SalesService.cancel", () => {
	const refusal = (...args: Parameters<typeof cancelSale>) =>
		cancelSale(...args).catch((reason) => reason);

	const lotsOf = (productId: string) =>
		db
			.select({ expiry: stockLots.expiry, quantity: stockLots.quantity })
			.from(stockLots)
			.where(eq(stockLots.productId, productId))
			.orderBy(asc(stockLots.expiry));

	it("gives the units back to the expiries they left, keeps the average cost and marks the sale with its reason", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await createProduct(storeId, { hasExpiry: true });
		await createPurchase(session, [
			purchaseItem(product.id, {
				quantity: 2,
				unitCost: 9200,
				expiry: monthFrom(2),
			}),
			purchaseItem(product.id, {
				quantity: 3,
				unitCost: 10_000,
				expiry: monthFrom(6),
			}),
		]);
		const before = await lotsOf(product.id);
		const sale = await createSale(session, [
			saleItem(product.id, { quantity: 3 }),
		]);
		const afterSale = await balanceOf(storeId, product.id);

		const canceled = await cancelSale(session, sale.id, "  Cliente desistiu  ");

		expect(canceled).toMatchObject({
			status: "canceled",
			cancelReason: "Cliente desistiu",
		});
		expect(canceled.canceledAt).not.toBeNull();
		expect(await lotsOf(product.id)).toEqual(before);
		const balance = await balanceOf(storeId, product.id);
		expect(balance?.quantity).toBe(5);
		// 5 at R$ 96,80 on average; 3 sold leave 2 worth R$ 193,60, and the 3 come back at R$ 96,80 each.
		expect(afterSale).toEqual({ quantity: 2, value: 19_360 });
		expect(balance?.value).toBe(48_400);
		const history = await ProductStockService.movements(storeId, product.id);
		expect(history.items[0]).toMatchObject({
			type: "sale_canceled",
			quantity: 3,
			unitCost: 9680,
			stockAfter: 5,
			averageCostAfter: 9680,
			origin: { kind: "sale", id: sale.id, number: 1 },
		});
	});

	it("brings back what the sale took when nothing is left in stock", async () => {
		const { session, storeId, product } = await stocked(2, 4000);
		const sale = await createSale(session, [
			saleItem(product.id, { quantity: 2 }),
		]);

		await cancelSale(session, sale.id);

		expect(await balanceOf(storeId, product.id)).toEqual({
			quantity: 2,
			value: 8000,
		});
	});

	it("gives units back to a lot that expired in the meantime", async () => {
		const { session } = await signedIn();
		const product = await createProduct(session.store.id, { hasExpiry: true });
		await createPurchase(session, [
			purchaseItem(product.id, { quantity: 2, expiry: monthFrom(0) }),
		]);
		const sale = await createSale(session, [saleItem(product.id)]);
		await setLotsExpiry(product.id, monthFrom(-1));

		await cancelSale(session, sale.id);

		expect(await lotsOf(product.id)).toEqual([
			{ expiry: `${monthFrom(-1)}-01`, quantity: 2 },
		]);
	});

	it("takes the sale out of the totals but keeps its numbers", async () => {
		const { session, storeId, product } = await stocked();
		const sale = await createSale(session, [saleItem(product.id)]);

		await cancelSale(session, sale.id);

		const page = await SalesService.list(storeId, {});
		expect(page.items[0]).toMatchObject({
			status: "canceled",
			revenue: 10_000,
			profit: 6000,
		});
		expect(page.totals).toMatchObject({ revenue: 0, profit: 0, count: 0 });
	});

	it("gives back every line of a sale with more than one product", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const a = await createProduct(storeId);
		const b = await createProduct(storeId);
		await createPurchase(session, [
			purchaseItem(a.id, { quantity: 4, unitCost: 1000 }),
			purchaseItem(b.id, { quantity: 2, unitCost: 500 }),
		]);
		const sale = await createSale(session, [
			saleItem(a.id, { quantity: 3 }),
			saleItem(b.id, { quantity: 2 }),
		]);

		await cancelSale(session, sale.id);

		expect(await balanceOf(storeId, a.id)).toEqual({
			quantity: 4,
			value: 4000,
		});
		expect(await balanceOf(storeId, b.id)).toEqual({
			quantity: 2,
			value: 1000,
		});
	});

	it("refuses units that would take the stock past what the ledger holds, and changes nothing", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await createProduct(storeId);
		await createPurchase(session, [purchaseItem(product.id)]);
		const sale = await createSale(session, [saleItem(product.id)]);
		await createPurchase(session, [
			purchaseItem(product.id, { unitCost: MAX_CENTS }),
		]);

		expect(await refusal(session, sale.id)).toMatchObject({
			code: 422,
			response: { code: "stock_limit" },
		});
		expect((await SalesService.get(storeId, sale.id)).status).toBe("active");
		expect(await balanceOf(storeId, product.id)).toEqual({
			quantity: 1,
			value: MAX_CENTS,
		});
	});

	it("unblocks the cancellation of the purchase its units came from", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await createProduct(storeId);
		const purchase = await createPurchase(session, [
			purchaseItem(product.id, { quantity: 2 }),
		]);
		const sale = await createSale(session, [saleItem(product.id)]);

		await cancelSale(session, sale.id);
		const canceled = await PurchasesService.cancel(session, purchase.id, {
			reason: null,
		});

		expect(canceled.status).toBe("canceled");
		expect(await balanceOf(storeId, product.id)).toEqual({
			quantity: 0,
			value: 0,
		});
	});

	it("refuses to cancel twice, and gives the units back once when two come at the same time", async () => {
		const { session, storeId, product } = await stocked(5);
		const sale = await createSale(session, [
			saleItem(product.id, { quantity: 2 }),
		]);

		const results = await Promise.all([
			refusal(session, sale.id),
			refusal(session, sale.id),
		]);
		const again = await refusal(session, sale.id);

		expect(results.filter((r) => r?.status === "canceled")).toHaveLength(1);
		expect(results.filter((r) => r?.code === 409)).toHaveLength(1);
		expect(again).toMatchObject({
			code: 409,
			response: { code: "sale_already_canceled" },
		});
		expect((await balanceOf(storeId, product.id))?.quantity).toBe(5);
	});

	it("answers 404 for a sale of another store, and changes nothing", async () => {
		const { session, product } = await stocked();
		const sale = await createSale(session, [saleItem(product.id)]);
		const other = await signedIn();

		expect(await refusal(other.session, sale.id)).toMatchObject({
			code: 404,
			response: { code: "sale_not_found" },
		});
		expect((await SalesService.get(session.store.id, sale.id)).status).toBe(
			"active",
		);
	});
});

describe("sales paid in cash or on term", () => {
	const rowOf = async (id: string) =>
		(await db.select().from(sales).where(eq(sales.id, id)))[0];

	it("enters a cash sale paid on its day, and a term sale unpaid with its due date and no method", async () => {
		const { session, storeId, product } = await stocked();
		const customer = await createCustomer(storeId);

		const cash = await createSale(session, [saleItem(product.id)], {
			date: storeDayFrom(-2),
		});
		const term = await createSale(
			session,
			[saleItem(product.id)],
			termSale(customer.id, 7),
		);

		expect(await rowOf(cash.id)).toMatchObject({
			paymentMethod: "pix",
			dueDate: null,
			paidAt: storeDayFrom(-2),
		});
		expect(await rowOf(term.id)).toMatchObject({
			paymentCondition: "term",
			paymentMethod: null,
			dueDate: storeDayFrom(7),
			paidAt: null,
			customerId: customer.id,
		});
		expect(term).toMatchObject({
			paymentStatus: "unpaid",
			paymentMethod: null,
			paidAt: null,
		});
		expect(cash.paymentStatus).toBeNull();
	});

	it("refuses a term sale without a customer, and a customer that's archived, and enters nothing", async () => {
		const { session, storeId, product } = await stocked();
		const archived = await createCustomer(storeId, { archived: true });

		// The rules run before the service's first await, so a refusal throws instead of rejecting.
		const refused = async (overrides: Parameters<typeof createSale>[2]) => {
			try {
				return await createSale(session, [saleItem(product.id)], overrides);
			} catch (reason) {
				return reason;
			}
		};

		const noCustomer = await refused({
			...termSale(archived.id),
			customerId: null,
		});
		const archivedCustomer = await refused(termSale(archived.id));

		expect(noCustomer).toMatchObject({
			code: 422,
			response: { field: "customerId" },
		});
		expect(archivedCustomer).toMatchObject({
			code: 422,
			response: { code: "customer_archived" },
		});
		expect(await db.select().from(sales)).toEqual([]);
	});

	it("keeps the database from holding a payment the rules refuse", async () => {
		const { session, storeId, product } = await stocked();
		const customer = await createCustomer(storeId);
		const term = await createSale(
			session,
			[saleItem(product.id)],
			termSale(customer.id),
		);
		const cash = await createSale(session, [saleItem(product.id)]);
		const write = (id: string, values: Partial<typeof sales.$inferInsert>) =>
			db
				.update(sales)
				.set(values)
				.where(eq(sales.id, id))
				.then(
					() => "written",
					() => "refused",
				);
		const day = storeDayFrom(0);

		expect(await write(term.id, { paymentMethod: "pix" })).toBe("refused");
		expect(await write(term.id, { paidAt: day })).toBe("refused");
		expect(await write(term.id, { dueDate: storeDayFrom(-3) })).toBe("refused");
		expect(await write(cash.id, { dueDate: day })).toBe("refused");
		expect(await write(cash.id, { paidAt: null, paymentMethod: null })).toBe(
			"refused",
		);
	});
});

describe("SalesService.pay and unpay", () => {
	const refusal = (call: () => Promise<unknown>) =>
		call().catch((reason) => reason);

	async function termSaleOf(daysDue = 7) {
		const signed = await stocked();
		const customer = await createCustomer(signed.storeId);
		const sale = await createSale(
			signed.session,
			[saleItem(signed.product.id, { quantity: 2 })],
			{ date: storeDayFrom(-5), ...termSale(customer.id, daysDue) },
		);
		return { ...signed, sale };
	}

	it("pays the whole sale on a day with a method, without touching revenue, costs or profit", async () => {
		const { session, sale } = await termSaleOf();

		const paid = await SalesService.pay(session, sale.id, {
			paidAt: storeDayFrom(-1),
			paymentMethod: "debit",
		});

		expect(paid).toMatchObject({
			paymentStatus: "paid",
			paymentMethod: "debit",
			paidAt: storeDayFrom(-1),
			revenue: sale.revenue,
			productsCost: sale.productsCost,
			saleCosts: sale.saleCosts,
			profit: sale.profit,
		});
	});

	it("takes a paid sale back to unpaid, clearing the day and the method, and logs both changes", async () => {
		const { session, sale } = await termSaleOf();
		await SalesService.pay(session, sale.id, {
			paidAt: storeDayFrom(0),
			paymentMethod: "pix",
		});

		const unpaid = await SalesService.unpay(session, sale.id);

		expect(unpaid).toMatchObject({
			paymentStatus: "unpaid",
			paymentMethod: null,
			paidAt: null,
		});
		const log = await db
			.select()
			.from(auditLog)
			.where(eq(auditLog.recordId, sale.id))
			.orderBy(asc(auditLog.createdAt), asc(auditLog.id));
		expect(log.map((entry) => entry.action)).toEqual([
			"insert",
			"update",
			"update",
		]);
		expect(log[2]).toMatchObject({
			userId: session.user.id,
			oldValues: expect.objectContaining({ payment_method: "pix" }),
			newValues: expect.objectContaining({ payment_method: null }),
		});
	});

	it("shows an unpaid sale as overdue the day after its due date", async () => {
		const { session, storeId, product } = await stocked();
		const customer = await createCustomer(storeId);
		const late = await createSale(session, [saleItem(product.id)], {
			date: storeDayFrom(-10),
			...termSale(customer.id, -1),
		});
		const lastDay = await createSale(session, [saleItem(product.id)], {
			date: storeDayFrom(-10),
			...termSale(customer.id, 0),
		});

		expect((await SalesService.get(storeId, late.id)).paymentStatus).toBe(
			"overdue",
		);
		expect((await SalesService.get(storeId, lastDay.id)).paymentStatus).toBe(
			"unpaid",
		);
	});

	it("refuses a day in the future or before the sale, and changes nothing", async () => {
		const { session, storeId, sale } = await termSaleOf();
		const pay = (paidAt: string) =>
			refusal(() =>
				SalesService.pay(session, sale.id, { paidAt, paymentMethod: "pix" }),
			);

		expect(await pay(storeDayFrom(1))).toMatchObject({
			code: 422,
			response: { field: "paidAt" },
		});
		expect(await pay(storeDayFrom(-6))).toMatchObject({
			code: 422,
			response: { field: "paidAt" },
		});
		expect((await SalesService.get(storeId, sale.id)).paidAt).toBeNull();
	});

	it("refuses to pay a cash, canceled or already paid sale, and to unpay one that isn't paid", async () => {
		const { session, storeId, product, sale } = await termSaleOf();
		const input = { paidAt: storeDayFrom(0), paymentMethod: "pix" } as const;
		const cash = await createSale(session, [saleItem(product.id)]);
		const canceled = await createSale(session, [saleItem(product.id)], {
			...termSale((await createCustomer(storeId)).id),
		});
		await cancelSale(session, canceled.id);
		await SalesService.pay(session, sale.id, input);

		expect(
			await refusal(() => SalesService.pay(session, cash.id, input)),
		).toMatchObject({ code: 409, response: { code: "sale_not_term" } });
		expect(
			await refusal(() => SalesService.pay(session, canceled.id, input)),
		).toMatchObject({ code: 409, response: { code: "sale_canceled" } });
		expect(
			await refusal(() => SalesService.pay(session, sale.id, input)),
		).toMatchObject({ code: 409, response: { code: "sale_already_paid" } });
		expect(
			await refusal(() => SalesService.unpay(session, canceled.id)),
		).toMatchObject({ code: 409, response: { code: "sale_canceled" } });
		expect(
			await refusal(() => SalesService.unpay(session, cash.id)),
		).toMatchObject({ code: 409, response: { code: "sale_not_term" } });
		await SalesService.unpay(session, sale.id);
		expect(
			await refusal(() => SalesService.unpay(session, sale.id)),
		).toMatchObject({ code: 409, response: { code: "sale_not_paid" } });
		expect((await SalesService.get(storeId, sale.id)).paidAt).toBeNull();
	});

	it("pays once when two payments come at the same time", async () => {
		const { session, sale } = await termSaleOf();
		const pay = (paymentMethod: "pix" | "credit") =>
			SalesService.pay(session, sale.id, {
				paidAt: storeDayFrom(0),
				paymentMethod,
			}).catch((reason) => reason);

		const results = await Promise.all([pay("pix"), pay("credit")]);

		expect(results.filter((r) => r?.paymentStatus === "paid")).toHaveLength(1);
		expect(results.filter((r) => r?.code === 409)).toHaveLength(1);
	});

	it("answers 404 for a sale of another store", async () => {
		const { sale } = await termSaleOf();
		const other = await signedIn();

		const pay = await refusal(() =>
			SalesService.pay(other.session, sale.id, {
				paidAt: storeDayFrom(0),
				paymentMethod: "pix",
			}),
		);
		const unpay = await refusal(() =>
			SalesService.unpay(other.session, sale.id),
		);

		expect(pay).toMatchObject({
			code: 404,
			response: { code: "sale_not_found" },
		});
		expect(unpay).toMatchObject({ code: 404 });
	});

	it("lists term sales by payment status, never the canceled ones", async () => {
		const { session, storeId, product } = await stocked(20);
		const customer = await createCustomer(storeId);
		const enter = (daysDue: number) =>
			createSale(session, [saleItem(product.id)], {
				date: storeDayFrom(-10),
				...termSale(customer.id, daysDue),
			});
		const unpaid = await enter(5);
		const overdue = await enter(-2);
		const paid = await enter(-2);
		const canceled = await enter(-2);
		await createSale(session, [saleItem(product.id)]);
		await SalesService.pay(session, paid.id, {
			paidAt: storeDayFrom(-1),
			paymentMethod: "pix",
		});
		await cancelSale(session, canceled.id);
		const idsOf = async (payment: "unpaid" | "overdue" | "paid") =>
			(await SalesService.list(storeId, { payment })).items.map((s) => s.id);

		expect(await idsOf("unpaid")).toEqual([unpaid.id]);
		expect(await idsOf("overdue")).toEqual([overdue.id]);
		expect(await idsOf("paid")).toEqual([paid.id]);
	});
});
