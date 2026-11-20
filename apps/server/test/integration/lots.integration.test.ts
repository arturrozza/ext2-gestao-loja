import { describe, expect, it } from "bun:test";
import { asc, eq } from "drizzle-orm";
import { db } from "../../src/db";
import { purchaseItems, stockLots } from "../../src/db/schema";
import { ProductsService } from "../../src/modules/products/products.service";
import { PurchasesService } from "../../src/modules/purchases/purchases.service";
import { useTestDatabase } from "../support/database";
import { signedIn } from "../support/factories/accounts";
import { createProduct } from "../support/factories/catalog";
import { createPurchase, purchaseItem } from "../support/factories/purchases";
import { createSale, saleItem } from "../support/factories/sales";
import { monthFrom } from "../support/factories/stock";

useTestDatabase();

/** Units left in each lot of a product, by the lot number or, without one, by the manufacture month. */
async function leftIn(productId: string, key: "lotCode" | "manufacturedOn") {
	const rows = await db
		.select({
			lotCode: stockLots.lotCode,
			manufacturedOn: stockLots.manufacturedOn,
			quantity: stockLots.quantity,
		})
		.from(stockLots)
		.where(eq(stockLots.productId, productId))
		.orderBy(asc(stockLots.createdAt), asc(stockLots.id));
	return Object.fromEntries(
		rows.map((row) => [
			(key === "manufacturedOn"
				? row.manufacturedOn?.slice(0, 7)
				: row.lotCode) ?? "none",
			row.quantity,
		]),
	);
}

describe("lot number and manufacture month on a purchase", () => {
	it("keeps them on the line and on its lot, and gives them back in the detail", async () => {
		const { session } = await signedIn();
		const product = await createProduct(session.store.id, { hasExpiry: true });
		const plain = await createProduct(session.store.id);

		const purchase = await createPurchase(session, [
			purchaseItem(product.id, {
				quantity: 3,
				expiry: monthFrom(12),
				lotCode: "  L2301 ",
				manufacturedOn: monthFrom(-2),
			}),
			purchaseItem(product.id, { quantity: 2, expiry: monthFrom(12) }),
			purchaseItem(plain.id, { manufacturedOn: monthFrom(-1) }),
		]);

		const lines = await db
			.select({
				lotCode: purchaseItems.lotCode,
				manufacturedOn: purchaseItems.manufacturedOn,
			})
			.from(purchaseItems)
			.orderBy(asc(purchaseItems.position));
		const lots = await db
			.select({
				lotCode: stockLots.lotCode,
				manufacturedOn: stockLots.manufacturedOn,
			})
			.from(stockLots)
			.orderBy(asc(stockLots.createdAt), asc(stockLots.id));
		const detail = await PurchasesService.get(session.store.id, purchase.id);

		expect(lines).toEqual([
			{
				lotCode: "L2301",
				manufacturedOn: `${monthFrom(-2)}-01`,
			},
			{ lotCode: null, manufacturedOn: null },
			{
				lotCode: null,
				manufacturedOn: `${monthFrom(-1)}-01`,
			},
		]);
		expect(lots).toHaveLength(3);
		expect(lots).toEqual(expect.arrayContaining(lines));
		expect(detail.items.map((i) => [i.lotCode, i.manufacturedOn])).toEqual([
			["L2301", monthFrom(-2)],
			[null, null],
			[null, monthFrom(-1)],
		]);
	});

	it("refuses a lot number on a product without expiry, and writes nothing", async () => {
		const { session } = await signedIn();
		const plain = await createProduct(session.store.id);

		const refused = await createPurchase(session, [
			purchaseItem(plain.id, { lotCode: "L1" }),
		]).catch((reason) => reason);

		expect(refused).toMatchObject({
			code: 422,
			response: { field: "items.0.lotCode" },
		});
		expect(await db.select().from(purchaseItems)).toEqual([]);
		expect(await db.select().from(stockLots)).toEqual([]);
	});

	it("lists the lots under each expiry in the order a sale takes them", async () => {
		const { session } = await signedIn();
		const product = await createProduct(session.store.id, { hasExpiry: true });
		const buy = (lotCode: string, manufacturedOn: string | null) =>
			createPurchase(session, [
				purchaseItem(product.id, {
					expiry: monthFrom(12),
					lotCode,
					manufacturedOn,
				}),
			]);
		await buy("SEM-FAB", null);
		await buy("NOVO", monthFrom(-1));
		await buy("ANTIGO", monthFrom(-9));
		await createPurchase(session, [
			purchaseItem(product.id, {
				expiry: monthFrom(3),
				lotCode: "VENCE-ANTES",
				manufacturedOn: monthFrom(-1),
			}),
		]);

		const { expiries } = await ProductsService.get(
			session.store.id,
			product.id,
		);

		expect(
			expiries.map((e) => [e.expiry, e.lots.map((lot) => lot.lotCode)]),
		).toEqual([
			[monthFrom(3), ["VENCE-ANTES"]],
			[monthFrom(12), ["ANTIGO", "NOVO", "SEM-FAB"]],
		]);
		expect(expiries[1]?.lots[0]).toEqual({
			id: expect.any(String),
			lotCode: "ANTIGO",
			manufacturedOn: monthFrom(-9),
			quantity: 1,
		});
		expect(expiries.map((e) => e.quantity)).toEqual([1, 3]);
	});
});

describe("which lot a sale takes", () => {
	it("takes the oldest manufacture first within the same expiry, and a lot without one last", async () => {
		const { session } = await signedIn();
		const product = await createProduct(session.store.id, { hasExpiry: true });
		const buy = (lotCode: string, manufacturedOn: string | null) =>
			createPurchase(session, [
				purchaseItem(product.id, {
					expiry: monthFrom(12),
					lotCode,
					manufacturedOn,
				}),
			]);
		// Entered in this order: the oldest made is the last to come in.
		await buy("SEM-FAB", null);
		await buy("NOVO", monthFrom(-2));
		await buy("ANTIGO", monthFrom(-10));
		const sell = () => createSale(session, [saleItem(product.id)]);

		await sell();
		expect(await leftIn(product.id, "lotCode")).toEqual({
			"SEM-FAB": 1,
			NOVO: 1,
			ANTIGO: 0,
		});
		await sell();
		expect(await leftIn(product.id, "lotCode")).toMatchObject({
			NOVO: 0,
			"SEM-FAB": 1,
		});
		await sell();
		expect(await leftIn(product.id, "lotCode")).toMatchObject({
			"SEM-FAB": 0,
		});
	});

	it("takes a sooner expiry before an older manufacture", async () => {
		const { session } = await signedIn();
		const product = await createProduct(session.store.id, { hasExpiry: true });
		await createPurchase(session, [
			purchaseItem(product.id, {
				expiry: monthFrom(12),
				lotCode: "FAB-ANTIGA",
				manufacturedOn: monthFrom(-20),
			}),
		]);
		await createPurchase(session, [
			purchaseItem(product.id, {
				expiry: monthFrom(3),
				lotCode: "VENCE-ANTES",
				manufacturedOn: monthFrom(-1),
			}),
		]);

		await createSale(session, [saleItem(product.id)]);

		expect(await leftIn(product.id, "lotCode")).toEqual({
			"FAB-ANTIGA": 1,
			"VENCE-ANTES": 0,
		});
	});

	it("on a product without expiry, takes the oldest manufacture first and a lot without one last", async () => {
		const { session } = await signedIn();
		const product = await createProduct(session.store.id);
		const buy = (manufacturedOn: string | null) =>
			createPurchase(session, [purchaseItem(product.id, { manufacturedOn })]);
		await buy(monthFrom(-2));
		await buy(null);
		await buy(monthFrom(-8));
		const sell = () => createSale(session, [saleItem(product.id)]);

		await sell();
		await sell();

		expect(await leftIn(product.id, "manufacturedOn")).toEqual({
			[monthFrom(-8)]: 0,
			[monthFrom(-2)]: 0,
			none: 1,
		});
	});

	it("splits a sale across the lots in that order", async () => {
		const { session } = await signedIn();
		const product = await createProduct(session.store.id, { hasExpiry: true });
		const buy = (lotCode: string, manufacturedOn: string, quantity: number) =>
			createPurchase(session, [
				purchaseItem(product.id, {
					quantity,
					expiry: monthFrom(12),
					lotCode,
					manufacturedOn,
				}),
			]);
		await buy("NOVO", monthFrom(-1), 5);
		await buy("ANTIGO", monthFrom(-6), 2);

		await createSale(session, [saleItem(product.id, { quantity: 4 })]);

		expect(await leftIn(product.id, "lotCode")).toEqual({ ANTIGO: 0, NOVO: 3 });
	});
});
