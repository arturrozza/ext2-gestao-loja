import { describe, expect, it } from "bun:test";
import { storeToday } from "../../src/lib/dates";
import { HomeService } from "../../src/modules/home/home.service";
import { useTestDatabase } from "../support/database";
import { signedIn } from "../support/factories/accounts";
import { createProduct } from "../support/factories/catalog";
import { createPurchase, purchaseItem } from "../support/factories/purchases";
import { cancelSale, createSale, saleItem } from "../support/factories/sales";
import { monthFrom } from "../support/factories/stock";

useTestDatabase();

describe("HomeService.summary", () => {
	it("sums this month's active sales, compares with the same days of last month and adds up the alerts", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await createProduct(storeId, { minStock: 1 });
		await createPurchase(session, [
			purchaseItem(product.id, { quantity: 10, unitCost: 4000 }),
		]);
		const today = storeToday();
		const lastMonth = `${monthFrom(-1)}-01`;
		// This month: R$ 100 − R$ 40 = R$ 60 of profit, twice; one more canceled.
		await createSale(session, [saleItem(product.id)]);
		await createSale(session, [saleItem(product.id)]);
		const canceled = await createSale(session, [saleItem(product.id)]);
		await cancelSale(session, canceled.id);
		// Last month's 1st (always within the same days): R$ 80 of profit.
		await createSale(session, [saleItem(product.id, { unitPrice: 12_000 })], {
			date: lastMonth,
		});

		const summary = await HomeService.summary(storeId, today);

		expect(summary.month).toEqual({
			start: `${monthFrom(0)}-01`,
			revenue: 20_000,
			profit: 12_000,
			margin: 0.6,
			salesCount: 2,
			profitChange: 0.5,
		});
		expect(summary.week).toHaveLength(7);
		expect(summary.week.at(-1)).toEqual({ date: today, revenue: 20_000 });
		expect(summary.alerts).toBe(0);
	});

	it("starts empty, with zeros and nothing to compare", async () => {
		const { session } = await signedIn();
		await createProduct(session.store.id, { minStock: 2 });

		const summary = await HomeService.summary(session.store.id);

		expect(summary.month).toMatchObject({
			revenue: 0,
			profit: 0,
			margin: null,
			salesCount: 0,
			profitChange: null,
		});
		expect(summary.week.every((day) => day.revenue === 0)).toBe(true);
		expect(summary.alerts).toBe(1);
	});

	it("sums only the store's own sales", async () => {
		const mine = await signedIn();
		const other = await signedIn();
		const product = await createProduct(other.session.store.id);
		await createPurchase(other.session, [purchaseItem(product.id)]);
		await createSale(other.session, [saleItem(product.id)]);

		const summary = await HomeService.summary(mine.session.store.id);

		expect(summary.month.salesCount).toBe(0);
	});
});
