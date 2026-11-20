import { describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { app } from "../../src/app";
import { MAX_CENTS } from "../../src/lib/money";
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
	saleBody,
	saleItem,
	termSale,
} from "../support/factories/sales";

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
		const canceled = await api
			.sales({ id: crypto.randomUUID() })
			.cancel.post({ reason: "Teste" });

		expect(posted.error?.status).toBe(401);
		expect(read.error?.status).toBe(401);
		expect(listed.error?.status).toBe(401);
		expect(canceled.error?.status).toBe(401);
	});
});

describe("POST /sales/:id/cancel", () => {
	it("cancels a sale with its reason, and it stays listed", async () => {
		const { headers, session, product } = await stocked();
		const sale = await createSale(session, [saleItem(product.id)]);

		const canceled = await api
			.sales({ id: sale.id })
			.cancel.post({ reason: "Cliente desistiu" }, { headers });
		const listed = await api.sales.get({ headers, query: {} });

		expect(canceled.error).toBeNull();
		expect(canceled.data).toMatchObject({
			status: "canceled",
			cancelReason: "Cliente desistiu",
		});
		expect(listed.data?.items.map((item) => item.status)).toEqual(["canceled"]);
		expect(listed.data?.totals.count).toBe(0);
	});

	it("answers 422 without a reason", async () => {
		const { headers, session, product } = await stocked();
		const sale = await createSale(session, [saleItem(product.id)]);
		const post = (body: unknown) =>
			api
				.sales({ id: sale.id })
				.cancel.post(body as { reason: string }, { headers });

		const missing = await post({});
		const blank = await post({ reason: "   " });
		const tooLong = await post({ reason: "x".repeat(501) });

		expect(missing.error?.status).toBe(422);
		expect(blank.error?.status).toBe(422);
		expect(tooLong.error?.status).toBe(422);
	});

	it("answers 409 when it's already canceled", async () => {
		const { headers, session, product } = await stocked();
		const sale = await createSale(session, [saleItem(product.id)]);
		await api
			.sales({ id: sale.id })
			.cancel.post({ reason: "Erro" }, { headers });

		const twice = await api
			.sales({ id: sale.id })
			.cancel.post({ reason: "Erro" }, { headers });

		expect(twice.error?.status).toBe(409);
		expect(twice.error?.value).toMatchObject({ code: "sale_already_canceled" });
	});

	it("answers 422 when the units would take the stock past what the ledger holds", async () => {
		const { headers, session, product } = await stocked();
		const sale = await createSale(session, [
			saleItem(product.id, { quantity: 10 }),
		]);
		await createPurchase(session, [
			purchaseItem(product.id, { unitCost: MAX_CENTS }),
		]);

		const canceled = await api
			.sales({ id: sale.id })
			.cancel.post({ reason: "Erro" }, { headers });

		expect(canceled.error?.status).toBe(422);
		expect(canceled.error?.value).toMatchObject({ code: "stock_limit" });
	});

	it("answers 404 for a sale of another store", async () => {
		const { session, product } = await stocked();
		const sale = await createSale(session, [saleItem(product.id)]);
		const other = await signedIn();

		const canceled = await api
			.sales({ id: sale.id })
			.cancel.post({ reason: "Erro" }, { headers: other.headers });

		expect(canceled.error?.status).toBe(404);
		expect(canceled.error?.value).toMatchObject({ code: "sale_not_found" });
	});
});

/** Eden hands a "YYYY-MM-DD" back as a `Date` at midnight UTC. */
const asDay = (day: string) => new Date(`${day}T00:00:00.000Z`);

describe("term sales", () => {
	async function termSaleEntered() {
		const stock = await stocked();
		const customer = await createCustomer(stock.storeId);
		const sale = await createSale(
			stock.session,
			[saleItem(stock.product.id)],
			termSale(customer.id),
		);
		return { ...stock, customer, sale };
	}

	const payBody = { paidAt: storeDayFrom(0), paymentMethod: "pix" } as const;

	it("enters a term sale with a due date, unpaid and with no method", async () => {
		const { headers, storeId, product } = await stocked();
		const customer = await createCustomer(storeId);

		const created = await api.sales.post(
			saleBody([saleItem(product.id)], termSale(customer.id, 3)),
			{ headers },
		);

		expect(created.error).toBeNull();
		expect(created.data).toMatchObject({
			paymentCondition: "term",
			paymentStatus: "unpaid",
			paymentMethod: null,
			paidAt: null,
			dueDate: asDay(storeDayFrom(3)),
		});
	});

	it("answers 422 for the payment fields a sale breaks", async () => {
		const { headers, storeId, product } = await stocked();
		const customer = await createCustomer(storeId);
		const post = (overrides: Partial<ReturnType<typeof saleBody>>) =>
			api.sales.post(saleBody([saleItem(product.id)], overrides), { headers });

		const noCustomer = await post({
			...termSale(customer.id),
			customerId: null,
		});
		const noDue = await post({ ...termSale(customer.id), dueDate: null });
		const withMethod = await post({
			...termSale(customer.id),
			paymentMethod: "pix",
		});
		const cashWithDue = await post({ dueDate: storeDayFrom(3) });
		const cashNoMethod = await post({ paymentMethod: null });

		expect(noCustomer.error?.value).toMatchObject({ field: "customerId" });
		expect(noDue.error?.value).toMatchObject({ field: "dueDate" });
		expect(withMethod.error?.value).toMatchObject({ field: "paymentMethod" });
		expect(cashWithDue.error?.value).toMatchObject({ field: "dueDate" });
		expect(cashNoMethod.error?.value).toMatchObject({ field: "paymentMethod" });
	});

	it("pays and unpays a sale, and filters the list by payment status", async () => {
		const { headers, sale } = await termSaleEntered();

		const paid = await api
			.sales({ id: sale.id })
			.pay.post(payBody, { headers });
		const listedPaid = await api.sales.get({
			headers,
			query: { payment: "paid" },
		});
		const unpaid = await api.sales({ id: sale.id }).unpay.post({}, { headers });
		const listedUnpaid = await api.sales.get({
			headers,
			query: { payment: "unpaid" },
		});

		expect(paid.data).toMatchObject({
			paymentStatus: "paid",
			paymentMethod: "pix",
			paidAt: asDay(storeDayFrom(0)),
		});
		expect(listedPaid.data?.items.map((item) => item.id)).toEqual([sale.id]);
		expect(unpaid.data).toMatchObject({
			paymentStatus: "unpaid",
			paymentMethod: null,
			paidAt: null,
		});
		expect(listedUnpaid.data?.items.map((item) => item.id)).toEqual([sale.id]);
	});

	it("answers 422 for a bad payment body or filter", async () => {
		const { headers, sale } = await termSaleEntered();
		const pay = (body: unknown) =>
			api.sales({ id: sale.id }).pay.post(body as typeof payBody, { headers });

		const noMethod = await pay({ paidAt: storeDayFrom(0) });
		const badMethod = await pay({ ...payBody, paymentMethod: "boleto" });
		const noDay = await pay({ paymentMethod: "pix" });
		const future = await pay({ ...payBody, paidAt: storeDayFrom(1) });
		const filter = await api.sales.get({
			headers,
			query: { payment: "late" } as unknown as { payment: "paid" },
		});

		expect(noMethod.error?.status).toBe(422);
		expect(badMethod.error?.status).toBe(422);
		expect(noDay.error?.status).toBe(422);
		expect(future.error?.value).toMatchObject({ field: "paidAt" });
		expect(filter.error?.status).toBe(422);
	});

	it("answers 409 for a sale that can't take the change", async () => {
		const { headers, session, product, sale } = await termSaleEntered();
		const cash = await createSale(session, [saleItem(product.id)]);

		const paid = await api
			.sales({ id: sale.id })
			.pay.post(payBody, { headers });
		const twice = await api
			.sales({ id: sale.id })
			.pay.post(payBody, { headers });
		const cashPay = await api
			.sales({ id: cash.id })
			.pay.post(payBody, { headers });
		const cashUnpay = await api
			.sales({ id: cash.id })
			.unpay.post({}, { headers });
		await api.sales({ id: sale.id }).unpay.post({}, { headers });
		const notPaid = await api
			.sales({ id: sale.id })
			.unpay.post({}, { headers });

		expect(paid.error).toBeNull();
		expect(twice.error?.value).toMatchObject({ code: "sale_already_paid" });
		expect(cashPay.error?.value).toMatchObject({ code: "sale_not_term" });
		expect(cashUnpay.error?.value).toMatchObject({ code: "sale_not_term" });
		expect(notPaid.error?.value).toMatchObject({ code: "sale_not_paid" });
	});

	it("answers 404 for a sale of another store and 401 without a session", async () => {
		const { sale } = await termSaleEntered();
		const other = await signedIn();

		const pay = await api
			.sales({ id: sale.id })
			.pay.post(payBody, { headers: other.headers });
		const unpay = await api
			.sales({ id: sale.id })
			.unpay.post({}, { headers: other.headers });
		const anonymous = await api.sales({ id: sale.id }).pay.post(payBody);

		expect(pay.error?.status).toBe(404);
		expect(unpay.error?.status).toBe(404);
		expect(anonymous.error?.status).toBe(401);
	});
});
