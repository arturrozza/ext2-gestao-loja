import { describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { app } from "../../src/app";
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
import { createSale, saleBody, saleItem } from "../support/factories/sales";

useTestDatabase();

const api = treaty(app);

/** A signed-in store with a product of 10 units bought at R$ 40. */
async function stocked() {
	const signed = await signedIn();
	const product = await createProduct(signed.session.store.id, {
		name: "Perfume",
	});
	await createPurchase(signed.session, [
		purchaseItem(product.id, { quantity: 10, unitCost: 4000 }),
	]);
	return { ...signed, storeId: signed.session.store.id, product };
}

describe("sales routes", () => {
	it("enters a sale with its real profit and reads it back", async () => {
		const { headers, product } = await stocked();

		const created = await api.sales.post(
			saleBody([saleItem(product.id, { quantity: 2 })], {
				discount: 2000,
				costs: [
					{ kind: "freight", mode: "amount", value: 1500, label: null },
					{ kind: "platform_fee", mode: "percent", value: 1000, label: null },
				],
			}),
			{ headers },
		);
		const read = await api.sales({ id: created.data?.id ?? "" }).get({
			headers,
		});

		expect(created.error).toBeNull();
		expect(created.data).toMatchObject({
			number: 1,
			revenue: 18_000,
			profit: 6700,
			items: [{ productName: "Perfume", quantity: 2, unitCost: 4000 }],
		});
		expect(read.data).toEqual(created.data);
	});

	it("answers 422 for a malformed body", async () => {
		const { headers, product } = await stocked();
		// What the typed client wouldn't let through.
		const post = (body: unknown) =>
			api.sales.post(body as ReturnType<typeof saleBody>, { headers });

		const noItems = await post(saleBody([]));
		const textPrice = await post(
			saleBody([
				{ ...saleItem(product.id), unitPrice: "100" as unknown as number },
			]),
		);
		const badChannel = await post(
			saleBody([saleItem(product.id)], {
				channel: "shop" as "store",
			}),
		);
		const fractionCost = await post(
			saleBody([saleItem(product.id)], {
				costs: [{ kind: "tax", mode: "percent", value: 10.5, label: null }],
			}),
		);

		const upperId = await post(saleBody([saleItem(product.id.toUpperCase())]));

		expect(noItems.error?.value).toMatchObject({ field: "items" });
		expect(upperId.error?.value).toMatchObject({ field: "items" });
		expect(textPrice.error?.value).toMatchObject({ field: "items" });
		expect(badChannel.error?.value).toMatchObject({ field: "channel" });
		expect(fractionCost.error?.value).toMatchObject({ field: "costs" });
		for (const response of [
			noItems,
			upperId,
			textPrice,
			badChannel,
			fractionCost,
		]) {
			expect(response.error?.status).toBe(422);
		}
	});

	it("answers 422 for each rule a sale breaks", async () => {
		const { headers, session, storeId, product } = await stocked();
		const archived = await createProduct(storeId, { archived: true });
		const gone = await createReseller(storeId, { archived: true });
		const goneCustomer = await createCustomer(storeId, { archived: true });
		const line = saleItem(product.id);

		const cases = [
			[
				saleBody([line], { date: storeDayFrom(1) }),
				{ code: "validation", field: "date" },
			],
			[
				saleBody([line], { channel: "reseller" }),
				{ code: "validation", field: "resellerId" },
			],
			[
				saleBody([line], { channel: "reseller", resellerId: gone.id }),
				{ code: "reseller_archived", field: "resellerId" },
			],
			[
				saleBody([line], { customerId: goneCustomer.id }),
				{ code: "customer_archived", field: "customerId" },
			],
			[
				saleBody([line], { customerId: crypto.randomUUID() }),
				{ code: "customer_not_found", field: "customerId" },
			],
			[
				saleBody([line], {
					costs: [{ kind: "tax", mode: "percent", value: 10_001, label: null }],
				}),
				{ code: "validation", field: "costs" },
			],
			[
				saleBody([line], { discount: 10_001 }),
				{ code: "validation", field: "discount" },
			],
			[
				saleBody([saleItem(product.id, { quantity: 11 })]),
				{
					code: "insufficient_stock",
					field: "items.0.quantity",
					message: "Estoque insuficiente: disponível 10.",
				},
			],
			[
				saleBody([line, saleItem(archived.id)]),
				{ code: "product_archived", field: "items.1.productId" },
			],
			[
				saleBody([line, line]),
				{ code: "duplicate_product", field: "items.1.productId" },
			],
			[
				saleBody([saleItem(crypto.randomUUID())]),
				{ code: "product_not_found", field: "items.0.productId" },
			],
		] as const;

		for (const [body, error] of cases) {
			const response = await api.sales.post(body, { headers });
			expect(response.error?.status).toBe(422);
			expect(response.error?.value).toMatchObject(error);
		}
		// Nothing of the refused ones went in.
		expect((await createSale(session, [line])).number).toBe(1);
	});

	it("lists the sales with the filters in the query", async () => {
		const { headers, session, product } = await stocked();
		const sale = await createSale(session, [saleItem(product.id)]);

		const listed = await api.sales.get({
			headers,
			query: {
				period: "month",
				channels: ["store", "reseller"],
				result: "profit",
				cursor: 0,
			},
		});
		const none = await api.sales.get({
			headers,
			query: { channels: ["mercado_livre"] },
		});

		expect(listed.data).toMatchObject({
			total: 1,
			nextCursor: null,
			totals: { revenue: 10_000, profit: 6000, count: 1 },
		});
		expect(listed.data?.items[0]).toMatchObject({ id: sale.id, number: 1 });
		expect(none.data?.total).toBe(0);
	});

	it("answers 422 for a bad list query", async () => {
		const { headers } = await signedIn();
		// What the typed client wouldn't let through.
		const period = await api.sales.get({
			headers,
			query: { period: "year" as "month" },
		});
		const channel = await api.sales.get({
			headers,
			query: { channels: ["shop" as "store"] },
		});
		const reseller = await api.sales.get({
			headers,
			query: { resellerId: "x" },
		});

		for (const response of [period, channel, reseller]) {
			expect(response.error?.status).toBe(422);
		}
	});

	it("answers 404 for a sale of another store and 422 for an id that isn't a uuid", async () => {
		const { headers } = await signedIn();
		const other = await stocked();
		const foreign = await createSale(other.session, [
			saleItem(other.product.id),
		]);

		const missing = await api.sales({ id: foreign.id }).get({ headers });
		const badId = await api.sales({ id: "x" }).get({ headers });

		expect(missing.error?.status).toBe(404);
		expect(missing.error?.value).toMatchObject({ code: "sale_not_found" });
		expect(badId.error?.status).toBe(422);
	});

	it("answers 401 without a session", async () => {
		const { product } = await stocked();

		const posted = await api.sales.post(saleBody([saleItem(product.id)]));
		const read = await api.sales({ id: crypto.randomUUID() }).get();
		const listed = await api.sales.get();

		expect(posted.error?.status).toBe(401);
		expect(read.error?.status).toBe(401);
		expect(listed.error?.status).toBe(401);
	});
});
