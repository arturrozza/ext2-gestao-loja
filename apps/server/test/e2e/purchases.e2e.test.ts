import { describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { app } from "../../src/app";
import { monthOf } from "../../src/lib/dates";
import { MAX_CENTS } from "../../src/lib/money";
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

const api = treaty(app);

describe("purchases routes", () => {
	it("enters a purchase and reads it back", async () => {
		const { headers, session } = await signedIn();
		const product = await createProduct(session.store.id, {
			name: "Perfume",
			hasExpiry: true,
		});
		const expiry = monthOf(storeDayFrom(60));

		const created = await api.purchases.post(
			purchaseBody([
				purchaseItem(product.id, { quantity: 10, unitCost: 9200, expiry }),
			]),
			{ headers },
		);
		const read = await api.purchases({ id: created.data?.id ?? "" }).get({
			headers,
		});

		expect(created.error).toBeNull();
		expect(created.data).toMatchObject({
			number: 1,
			status: "active",
			total: 92_000,
			items: [
				{
					productName: "Perfume",
					quantity: 10,
					unitCost: 9200,
					total: 92_000,
					expiry,
				},
			],
		});
		expect(read.data).toEqual(created.data);
	});

	it("answers 422 for a malformed body", async () => {
		const { headers, session } = await signedIn();
		const product = await createProduct(session.store.id);
		// What the typed client wouldn't let through.
		const post = (body: unknown) =>
			api.purchases.post(body as ReturnType<typeof purchaseBody>, {
				headers,
			});

		const noItems = await post(purchaseBody([]));
		const textQuantity = await post(
			purchaseBody([
				{ ...purchaseItem(product.id), quantity: "10" as unknown as number },
			]),
		);
		const fractionCost = await post(
			purchaseBody([purchaseItem(product.id, { unitCost: 92.5 })]),
		);
		const badExpiry = await post(
			purchaseBody([purchaseItem(product.id, { expiry: "03/2027" })]),
		);
		const badDate = await post(
			purchaseBody([purchaseItem(product.id)], { date: "09/11/2026" }),
		);
		const missingDay = await post(
			purchaseBody([purchaseItem(product.id)], { date: "2026-02-30" }),
		);

		for (const response of [noItems, textQuantity, fractionCost, badExpiry]) {
			expect(response.error?.value).toMatchObject({
				code: "validation",
				field: "items",
			});
		}
		for (const response of [badDate, missingDay]) {
			expect(response.error?.status).toBe(422);
			expect(response.error?.value).toMatchObject({
				code: "validation",
				field: "date",
			});
		}
	});

	it("answers 422 for each rule a purchase breaks", async () => {
		const { headers, session } = await signedIn();
		const storeId = session.store.id;
		const plain = await createProduct(storeId);
		const expiring = await createProduct(storeId, { hasExpiry: true });
		const archived = await createProduct(storeId, { archived: true });
		const lastMonth = monthOf(storeDayFrom(-40));
		const post = (body: ReturnType<typeof purchaseBody>) =>
			api.purchases.post(body, { headers });

		const cases = [
			[
				purchaseBody([purchaseItem(plain.id)], { date: storeDayFrom(2) }),
				{ code: "validation", field: "date" },
			],
			[
				purchaseBody([purchaseItem(expiring.id)]),
				{ code: "validation", field: "items.0.expiry" },
			],
			[
				purchaseBody([purchaseItem(plain.id, { expiry: "2099-01" })]),
				{ code: "validation", field: "items.0.expiry" },
			],
			[
				purchaseBody([purchaseItem(expiring.id, { expiry: lastMonth })]),
				{ code: "validation", field: "items.0.expiry" },
			],
			[
				purchaseBody([purchaseItem(plain.id), purchaseItem(archived.id)]),
				{ code: "product_archived", field: "items.1.productId" },
			],
			[
				purchaseBody([purchaseItem(crypto.randomUUID())]),
				{ code: "product_not_found", field: "items.0.productId" },
			],
			[
				purchaseBody([
					purchaseItem(plain.id, { quantity: 2, unitCost: MAX_CENTS }),
				]),
				{ code: "stock_limit", field: "items.0.quantity" },
			],
		] as const;

		for (const [body, error] of cases) {
			const response = await post(body);
			expect(response.error?.status).toBe(422);
			expect(response.error?.value).toMatchObject(error);
		}
	});

	it("lists the history with status and cursor in the query", async () => {
		const { headers, session } = await signedIn();
		const product = await createProduct(session.store.id);
		const purchase = await createPurchase(session, [purchaseItem(product.id)]);

		const listed = await api.purchases.get({
			headers,
			query: { status: "active", cursor: 0 },
		});
		const canceled = await api.purchases.get({
			headers,
			query: { status: "canceled" },
		});

		expect(listed.data).toMatchObject({ total: 1, nextCursor: null });
		expect(listed.data?.items[0]).toMatchObject({
			id: purchase.id,
			number: 1,
			total: 1000,
		});
		expect(canceled.data?.total).toBe(0);
	});

	it("answers 422 for a bad list query", async () => {
		const { headers } = await signedIn();

		const status = await api.purchases.get({
			headers,
			// What the typed client wouldn't let through.
			query: { status: "open" as "active" },
		});
		const cursor = await api.purchases.get({ headers, query: { cursor: -1 } });

		expect(status.error?.status).toBe(422);
		expect(cursor.error?.status).toBe(422);
	});

	it("answers 404 for a purchase of another store and 422 for an id that isn't a uuid", async () => {
		const { headers } = await signedIn();
		const other = await signedIn();
		const product = await createProduct(other.session.store.id);
		const foreign = await createPurchase(other.session, [
			purchaseItem(product.id),
		]);

		const missing = await api.purchases({ id: foreign.id }).get({ headers });
		const badId = await api.purchases({ id: "x" }).get({ headers });

		expect(missing.error?.status).toBe(404);
		expect(missing.error?.value).toMatchObject({ code: "purchase_not_found" });
		expect(badId.error?.status).toBe(422);
	});

	it("answers 401 without a session", async () => {
		const created = await api.purchases.post(
			purchaseBody([purchaseItem(crypto.randomUUID())]),
		);
		const read = await api.purchases({ id: crypto.randomUUID() }).get();
		const listed = await api.purchases.get();

		expect(created.error?.status).toBe(401);
		expect(read.error?.status).toBe(401);
		expect(listed.error?.status).toBe(401);
	});
});
