import { describe, expect, it } from "bun:test";
import { AlertsService } from "../../src/modules/alerts/alerts.service";
import { useTestDatabase } from "../support/database";
import { signedIn } from "../support/factories/accounts";
import { createProduct } from "../support/factories/catalog";
import { createPurchase, purchaseItem } from "../support/factories/purchases";
import { monthFrom, setLotsExpiry } from "../support/factories/stock";

useTestDatabase();

describe("AlertsService.counts", () => {
	it("counts the active products in each alert, like the product list's filters", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const low = await createProduct(storeId, { minStock: 5 });
		await createProduct(storeId, { minStock: 5 }); // out of stock
		await createProduct(storeId); // never bought, no minimum: no alert
		const near = await createProduct(storeId, { hasExpiry: true });
		const expired = await createProduct(storeId, {
			hasExpiry: true,
			minStock: 20,
		});
		await createProduct(storeId, { minStock: 5, archived: true });
		await createPurchase(session, [
			purchaseItem(low.id, { quantity: 3 }),
			purchaseItem(near.id, { quantity: 4, expiry: monthFrom(0) }),
			purchaseItem(expired.id, { quantity: 2, expiry: monthFrom(0) }),
		]);
		await setLotsExpiry(expired.id, monthFrom(-1));

		// "expired" is also low by its minimum: a product can be in two alerts.
		expect(await AlertsService.counts(storeId)).toEqual({
			lowStock: 2,
			outOfStock: 1,
			nearExpiry: 1,
			expired: 1,
		});
	});

	it("vanishes once the problem is solved", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await createProduct(storeId, { minStock: 5 });
		expect((await AlertsService.counts(storeId)).outOfStock).toBe(1);

		await createPurchase(session, [purchaseItem(product.id, { quantity: 10 })]);

		expect(await AlertsService.counts(storeId)).toEqual({
			lowStock: 0,
			outOfStock: 0,
			nearExpiry: 0,
			expired: 0,
		});
	});

	it("counts only the store's own products", async () => {
		const mine = await signedIn();
		const other = await signedIn();
		await createProduct(other.session.store.id, { minStock: 5 });

		expect((await AlertsService.counts(mine.session.store.id)).outOfStock).toBe(
			0,
		);
	});
});
