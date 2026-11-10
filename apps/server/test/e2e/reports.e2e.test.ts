import { describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { app } from "../../src/app";
import { storeToday } from "../../src/lib/dates";
import { useTestDatabase } from "../support/database";
import { signedIn } from "../support/factories/accounts";
import { createProduct } from "../support/factories/catalog";
import { createPurchase, purchaseItem } from "../support/factories/purchases";
import { createSale, saleItem } from "../support/factories/sales";

useTestDatabase();

// Days stay strings, as in the app (`parseDate: false` in `lib/api.ts`): Eden would turn "2026-11-09" into a `Date`.
const api = treaty(app, { parseDate: false });

describe("GET /reports", () => {
	it("gives the report of the current month by default", async () => {
		const { headers, session } = await signedIn();
		const product = await createProduct(session.store.id, { name: "Perfume" });
		await createPurchase(session, [
			purchaseItem(product.id, { quantity: 10, unitCost: 4000 }),
		]);
		await createSale(session, [saleItem(product.id, { quantity: 2 })]);

		const { data, error } = await api.reports.get({ headers, query: {} });

		expect(error).toBeNull();
		expect(data?.to).toBe(storeToday());
		expect(data?.summary).toMatchObject({
			revenue: 20_000,
			profit: 12_000,
			count: 1,
			margin: 0.6,
		});
		expect(data?.products.bestSellers).toMatchObject([
			{ name: "Perfume", quantity: 2, revenue: 20_000, margin: 0.6 },
		]);
	});

	it("takes the period from the query", async () => {
		const { headers } = await signedIn();

		const { data } = await api.reports.get({
			headers,
			query: { period: "custom", from: "2026-01-01", to: "2026-01-31" },
		});

		expect(data).toMatchObject({
			from: "2026-01-01",
			to: "2026-01-31",
			evolutionUnit: "day",
			summary: { count: 0 },
		});
		expect(data?.evolution).toHaveLength(31);
	});

	it("answers 422 for a bad period", async () => {
		const { headers } = await signedIn();
		// What the typed client wouldn't let through.
		const get = (query: Record<string, string>) =>
			api.reports.get({ headers, query: query as { period?: "today" } });

		const unknown = await get({ period: "year" });
		const noDays = await get({ period: "custom" });
		const backwards = await get({
			period: "custom",
			from: "2026-02-01",
			to: "2026-01-01",
		});
		const future = await get({
			period: "custom",
			from: "2026-01-01",
			to: "2999-01-01",
		});
		const unreal = await get({
			period: "custom",
			from: "2026-02-30",
			to: "2026-03-01",
		});
		const tooLong = await get({
			period: "custom",
			from: "2010-01-01",
			to: "2026-01-01",
		});

		expect(unknown.error?.status).toBe(422);
		expect(noDays.error?.value).toMatchObject({ field: "from" });
		expect(backwards.error?.value).toMatchObject({ field: "from" });
		expect(future.error?.value).toMatchObject({ field: "to" });
		expect(unreal.error?.value).toMatchObject({ field: "from" });
		expect(tooLong.error?.value).toMatchObject({ field: "to" });
	});

	it("answers 401 without a session", async () => {
		const { error } = await api.reports.get({ query: {} });
		expect(error?.status).toBe(401);
	});
});
