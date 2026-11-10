import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { audited } from "../../src/db/audit";
import { categories, products, resellers } from "../../src/db/schema";
import { storeToday } from "../../src/lib/dates";
import { ReportsService } from "../../src/modules/reports/reports.service";
import { useTestDatabase } from "../support/database";
import { signedIn } from "../support/factories/accounts";
import { createCategory, createProduct } from "../support/factories/catalog";
import {
	createPurchase,
	purchaseItem,
	storeDayFrom,
} from "../support/factories/purchases";
import { createReseller } from "../support/factories/resellers";
import { cancelSale, createSale, saleItem } from "../support/factories/sales";
import { monthFrom } from "../support/factories/stock";

useTestDatabase();

type Session = Awaited<ReturnType<typeof signedIn>>["session"];

/** A product of the session's store with 50 units bought at `unitCost`. */
async function stocked(
	session: Session,
	unitCost: number,
	overrides: Parameters<typeof createProduct>[1] = {},
) {
	const product = await createProduct(session.store.id, overrides);
	await createPurchase(session, [
		purchaseItem(product.id, { quantity: 50, unitCost }),
	]);
	return product;
}

const freight = (value: number) =>
	({ kind: "freight", mode: "amount", value, label: null }) as const;
const percent = (kind: "platform_fee" | "commission", value: number) =>
	({ kind, mode: "percent", value, label: null }) as const;

describe("ReportsService.report", () => {
	it("reports the period: summary, costs that add up to the revenue, channels, resellers, products and categories", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const hair = await createCategory(storeId, { name: "Cabelo" });
		const shampoo = await stocked(session, 4000, {
			name: "Shampoo",
			categoryId: hair.id,
		});
		const necklace = await stocked(session, 500, { name: "Colar" });
		const ana = await createReseller(storeId, { name: "Ana" });
		// R$ 220 of lines − R$ 20 of discount = R$ 200; R$ 85 of products and R$ 10 of freight → R$ 105.
		await createSale(
			session,
			[
				saleItem(shampoo.id, { quantity: 2, unitPrice: 10_000 }),
				saleItem(necklace.id, { unitPrice: 2000 }),
			],
			{ discount: 2000, costs: [freight(1000)] },
		);
		await createSale(session, [saleItem(shampoo.id, { unitPrice: 9000 })], {
			channel: "mercado_livre",
			costs: [percent("platform_fee", 1000)],
		});
		await createSale(
			session,
			[saleItem(necklace.id, { quantity: 4, unitPrice: 2000 })],
			{
				channel: "reseller",
				resellerId: ana.id,
				costs: [percent("commission", 1000)],
			},
		);
		const wrong = await createSale(session, [saleItem(shampoo.id)]);
		await cancelSale(session, wrong.id);

		const report = await ReportsService.report(storeId, { period: "month" });

		expect(report.summary).toMatchObject({
			revenue: 37_000,
			profit: 19_800,
			count: 3,
			averageTicket: 12_333,
		});
		expect(report.costs).toEqual({
			products: 14_500,
			freight: 1000,
			tax: 0,
			fees: 900,
			commissions: 800,
			other: 0,
		});
		expect(report.channels).toEqual([
			{ channel: "store", revenue: 20_000, profit: 10_500 },
			{ channel: "mercado_livre", revenue: 9000, profit: 4100 },
			{ channel: "reseller", revenue: 8000, profit: 5200 },
		]);
		expect(report.resellers).toEqual([
			{ id: ana.id, name: "Ana", revenue: 8000, commission: 800 },
		]);
		// The first sale's R$ 200 and R$ 10 of freight go by the value of its lines (R$ 200 and R$ 20 of the R$ 220).
		expect(report.categories).toEqual([
			{ id: hair.id, name: "Cabelo", revenue: 27_182, profit: 13_373 },
			{ id: null, name: "Sem categoria", revenue: 9818, profit: 6427 },
		]);
		expect(report.products.bestSellers.map((row) => row.name)).toEqual([
			"Colar",
			"Shampoo",
		]);
		expect(report.products.bestMargin.map((row) => row.name)).toEqual([
			"Colar",
			"Shampoo",
		]);
		expect(report.products.worstMargin.map((row) => row.name)).toEqual([
			"Shampoo",
			"Colar",
		]);
	});

	it("adds up: costs + profit = revenue, and so do the products' and categories' revenue and profit", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const a = await stocked(session, 1234);
		const b = await stocked(session, 777);
		const c = await stocked(session, 99);
		await createSale(
			session,
			[
				saleItem(a.id, { quantity: 3, unitPrice: 3333 }),
				saleItem(b.id, { quantity: 2, unitPrice: 777 }),
				// A gift that goes with the sale.
				saleItem(c.id, { unitPrice: 0 }),
			],
			{
				discount: 123,
				surcharge: 55,
				costs: [freight(1001), percent("platform_fee", 333)],
			},
		);

		const report = await ReportsService.report(storeId, { period: "today" });

		const costs = Object.values(report.costs).reduce((sum, x) => sum + x, 0);
		expect(costs + report.summary.profit).toBe(report.summary.revenue);
		const byCategory = report.categories.reduce(
			(sum, row) => ({
				revenue: sum.revenue + row.revenue,
				profit: sum.profit + row.profit,
			}),
			{ revenue: 0, profit: 0 },
		);
		expect(byCategory).toEqual({
			revenue: report.summary.revenue,
			profit: report.summary.profit,
		});
	});

	it("takes the sales by their day, in each period", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await stocked(session, 4000);
		const lastMonthFirst = `${monthFrom(-1)}-01`;
		await createSale(session, [saleItem(product.id)]);
		await createSale(session, [saleItem(product.id, { unitPrice: 20_000 })], {
			date: lastMonthFirst,
		});
		const count = async (query: Parameters<typeof ReportsService.report>[1]) =>
			(await ReportsService.report(storeId, query)).summary.count;

		expect(await count({ period: "today" })).toBe(1);
		expect(await count({ period: "7d" })).toBe(1);
		expect(await count({})).toBe(1);
		expect(await count({ period: "last_month" })).toBe(1);
		expect(
			await count({ period: "custom", from: lastMonthFirst, to: storeToday() }),
		).toBe(2);
		expect(
			await count({
				period: "custom",
				from: lastMonthFirst,
				to: lastMonthFirst,
			}),
		).toBe(1);
		const lastMonth = await ReportsService.report(storeId, {
			period: "last_month",
		});
		expect(lastMonth.summary.revenue).toBe(20_000);
		expect(lastMonth.from).toBe(lastMonthFirst);
	});

	it("keeps archived products, categories and resellers in the periods they sold in", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const category = await createCategory(storeId, { name: "Antiga" });
		const product = await stocked(session, 4000, {
			name: "Descontinuado",
			categoryId: category.id,
		});
		const reseller = await createReseller(storeId, { name: "Zeca" });
		await createSale(session, [saleItem(product.id)], {
			channel: "reseller",
			resellerId: reseller.id,
			costs: [percent("commission", 1000)],
		});
		await audited("system", async (tx) => {
			const archivedAt = new Date();
			await tx
				.update(products)
				.set({ archivedAt })
				.where(eq(products.id, product.id));
			await tx
				.update(categories)
				.set({ archivedAt })
				.where(eq(categories.id, category.id));
			await tx
				.update(resellers)
				.set({ archivedAt })
				.where(eq(resellers.id, reseller.id));
		});

		const report = await ReportsService.report(storeId, { period: "today" });

		expect(report.products.bestSellers.map((row) => row.name)).toEqual([
			"Descontinuado",
		]);
		expect(report.categories.map((row) => row.name)).toEqual(["Antiga"]);
		expect(report.resellers).toEqual([
			{ id: reseller.id, name: "Zeca", revenue: 10_000, commission: 1000 },
		]);
	});

	it("has a bar per 7 days on a period of two months, with the days without sales at zero", async () => {
		const { session } = await signedIn();
		const product = await stocked(session, 4000);
		await createSale(session, [saleItem(product.id)]);

		const report = await ReportsService.report(session.store.id, {
			period: "custom",
			from: storeDayFrom(-59),
			to: storeToday(),
		});

		expect(report.evolutionUnit).toBe("week");
		expect(report.evolution).toHaveLength(9);
		expect(report.evolution.at(-1)).toMatchObject({
			revenue: 10_000,
			profit: 6000,
		});
		expect(
			report.evolution.slice(0, -1).every((bar) => bar.revenue === 0),
		).toBe(true);
	});

	it("is empty without sales", async () => {
		const { session } = await signedIn();

		const report = await ReportsService.report(session.store.id, {});

		expect(report.summary).toMatchObject({
			count: 0,
			revenue: 0,
			margin: null,
		});
		expect(report.products.bestSellers).toEqual([]);
		expect(report.channels).toHaveLength(3);
	});

	it("reports only the store's own sales", async () => {
		const mine = await signedIn();
		const other = await signedIn();
		const product = await stocked(other.session, 4000);
		await createSale(other.session, [saleItem(product.id)]);

		const report = await ReportsService.report(mine.session.store.id, {});

		expect(report.summary.count).toBe(0);
		expect(report.categories).toEqual([]);
	});
});
