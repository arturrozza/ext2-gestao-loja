import { describe, expect, it } from "bun:test";
import { thrown } from "../../../test/support/thrown";
import { MAX_CENTS } from "../../lib/money";
import type { LockedProduct } from "../products/products.lock";
import type { SalesModel } from "./sales.model";
import {
	assertCanPay,
	assertCanUnpay,
	assertChannel,
	assertItems,
	assertParty,
	assertPayment,
	assertSaleDate,
	assertUniqueProducts,
	computeTotals,
	marginOf,
	type PayableSale,
	type PaymentFacts,
	paymentStatusOf,
	periodStart,
	planLines,
} from "./sales.rules";

const product = (overrides: Partial<LockedProduct> = {}): LockedProduct => ({
	id: "p1",
	name: "Perfume",
	hasExpiry: false,
	archived: false,
	...overrides,
});

const item = (productId = "p1", quantity = 1) => ({
	productId,
	quantity,
	unitPrice: 10_000,
});

const body = (
	overrides: Partial<SalesModel["body"]> = {},
): SalesModel["body"] => ({
	date: "2026-11-09",
	channel: "store",
	resellerId: null,
	customerId: null,
	items: [item()],
	discount: 0,
	surcharge: 0,
	costs: [],
	paymentCondition: "cash",
	paymentMethod: "pix",
	...overrides,
});

describe("computeTotals", () => {
	it("2 × R$ 100, R$ 20 off, cost R$ 40, R$ 15 freight and a 10% fee: R$ 180 revenue, R$ 67 profit", () => {
		const totals = computeTotals({
			lines: [{ quantity: 2, unitPrice: 10_000, cost: 8000 }],
			discount: 2000,
			surcharge: 0,
			costs: [
				{ mode: "amount", value: 1500 },
				{ mode: "percent", value: 1000 },
			],
		});

		expect(totals).toEqual({
			revenue: 18_000,
			productsCost: 8000,
			saleCosts: 3300,
			profit: 6700,
			costs: [
				{ mode: "amount", value: 1500, amount: 1500 },
				{ mode: "percent", value: 1000, amount: 1800 },
			],
		});
	});

	it("adds the surcharge to the revenue, and the percentages are of it", () => {
		const totals = computeTotals({
			lines: [{ quantity: 1, unitPrice: 10_000, cost: 0 }],
			discount: 0,
			surcharge: 1000,
			costs: [{ mode: "percent", value: 1000 }],
		});

		expect(totals).toMatchObject({
			revenue: 11_000,
			costs: [{ amount: 1100 }],
		});
	});

	it("rounds each percentage to the cent", () => {
		// 12,5% of R$ 0,05 is 0,625 cent: 1 cent.
		const totals = computeTotals({
			lines: [{ quantity: 1, unitPrice: 5, cost: 0 }],
			discount: 0,
			surcharge: 0,
			costs: [{ mode: "percent", value: 1250 }],
		});

		expect(totals.costs.map((cost) => cost.amount)).toEqual([1]);
	});

	it("lets a loss through", () => {
		const totals = computeTotals({
			lines: [{ quantity: 1, unitPrice: 5000, cost: 8000 }],
			discount: 0,
			surcharge: 0,
			costs: [],
		});

		expect(totals.profit).toBe(-3000);
	});

	it("takes a discount of the whole sale, and a gift at zero", () => {
		const totals = computeTotals({
			lines: [
				{ quantity: 1, unitPrice: 10_000, cost: 4000 },
				{ quantity: 1, unitPrice: 0, cost: 500 },
			],
			discount: 10_000,
			surcharge: 0,
			costs: [],
		});

		expect(totals).toMatchObject({ revenue: 0, profit: -4500 });
	});

	it("refuses a discount bigger than the sale", () => {
		const error = thrown(() =>
			computeTotals({
				lines: [{ quantity: 1, unitPrice: 10_000, cost: 0 }],
				discount: 10_001,
				surcharge: 0,
				costs: [],
			}),
		);

		expect(error).toMatchObject({ code: 422, response: { field: "discount" } });
	});

	it("refuses a revenue past what the system keeps", () => {
		const huge = { quantity: 100_000, unitPrice: MAX_CENTS, cost: 0 };
		const over = (lines: (typeof huge)[], surcharge = 0) =>
			thrown(() => computeTotals({ lines, discount: 0, surcharge, costs: [] }));

		expect(over(Array(100).fill(huge))).toMatchObject({
			response: { code: "sale_limit" },
		});
		expect(
			over([{ quantity: 1, unitPrice: MAX_CENTS, cost: 0 }], 1),
		).toMatchObject({ response: { code: "sale_limit" } });
	});
});

describe("planLines", () => {
	const balances = new Map([["p1", { quantity: 7, value: 28_000 }]]);
	const lots = new Map([
		[
			"p1",
			[
				{ id: "soon", quantity: 2 },
				{ id: "later", quantity: 3 },
			],
		],
	]);

	it("takes the units from the sellable lots at the average cost", () => {
		const [line] = planLines([item("p1", 3)], balances, lots);

		expect(line).toMatchObject({
			productId: "p1",
			quantity: 3,
			unitPrice: 10_000,
			unitCost: 4000,
			cost: 12_000,
			plan: {
				takes: [
					{ lotId: "soon", units: 2 },
					{ lotId: "later", units: 1 },
				],
			},
		});
	});

	it("blocks with what's available when the sellable lots fall short", () => {
		// 7 in stock, but only 5 sellable (the rest expired).
		const error = thrown(() => planLines([item("p1", 6)], balances, lots));

		expect(error).toMatchObject({
			code: 422,
			response: {
				code: "insufficient_stock",
				message: "Estoque insuficiente: disponível 5.",
				field: "items.0.quantity",
			},
		});
	});

	it("blocks a product without stock", () => {
		const error = thrown(() => planLines([item("p2")], balances, lots));

		expect(error).toMatchObject({
			response: { message: "Estoque insuficiente: disponível 0." },
		});
	});
});

describe("assertItems", () => {
	const check = (
		items: ReturnType<typeof item>[],
		products: LockedProduct[] = [product()],
	) =>
		thrown(() => assertItems(items, new Map(products.map((p) => [p.id, p]))));

	it("takes active products of the store", () => {
		expect(check([item()])).toBe(undefined);
	});

	it("refuses a product that isn't in the store, on the line's field", () => {
		expect(check([item(), item("nope")])).toMatchObject({
			response: { code: "product_not_found", field: "items.1.productId" },
		});
	});

	it("refuses an archived product", () => {
		expect(check([item()], [product({ archived: true })])).toMatchObject({
			response: { code: "product_archived", field: "items.0.productId" },
		});
	});
});

describe("assertUniqueProducts", () => {
	it("refuses the same product twice, on the second line", () => {
		expect(
			thrown(() => assertUniqueProducts([item(), item("p2"), item()])),
		).toMatchObject({
			response: { code: "duplicate_product", field: "items.2.productId" },
		});
		expect(thrown(() => assertUniqueProducts([item(), item("p2")]))).toBe(
			undefined,
		);
	});
});

describe("assertSaleDate", () => {
	it("takes today and the past", () => {
		expect(thrown(() => assertSaleDate("2026-11-09", "2026-11-09"))).toBe(
			undefined,
		);
		expect(thrown(() => assertSaleDate("2026-01-31", "2026-11-09"))).toBe(
			undefined,
		);
	});

	it("refuses the future and a day that doesn't exist", () => {
		expect(
			thrown(() => assertSaleDate("2026-11-10", "2026-11-09")),
		).toMatchObject({
			response: {
				field: "date",
				message: "A data da venda não pode ser no futuro.",
			},
		});
		expect(
			thrown(() => assertSaleDate("2026-02-30", "2026-11-09")),
		).toMatchObject({ response: { message: "Confira a data da venda." } });
	});
});

describe("assertChannel", () => {
	it("requires the reseller on the reseller channel", () => {
		expect(
			thrown(() => assertChannel(body({ channel: "reseller" }))),
		).toMatchObject({ response: { field: "resellerId" } });
		expect(
			thrown(() =>
				assertChannel(body({ channel: "reseller", resellerId: "r1" })),
			),
		).toBe(undefined);
	});

	it("refuses a reseller on another channel", () => {
		expect(
			thrown(() => assertChannel(body({ resellerId: "r1" }))),
		).toMatchObject({ response: { field: "resellerId" } });
	});
});

describe("assertParty", () => {
	it("takes an active one", () => {
		expect(thrown(() => assertParty("customerId", "active"))).toBe(undefined);
	});

	it("refuses one that isn't the store's, or is archived", () => {
		expect(thrown(() => assertParty("customerId", "missing"))).toMatchObject({
			response: { code: "customer_not_found", field: "customerId" },
		});
		expect(thrown(() => assertParty("resellerId", "archived"))).toMatchObject({
			response: { code: "reseller_archived", field: "resellerId" },
		});
	});
});

describe("marginOf", () => {
	it("is the profit over the revenue, null without revenue", () => {
		expect(marginOf(6700, 18_000)).toBeCloseTo(0.3722, 4);
		expect(marginOf(-500, 0)).toBe(null);
	});
});

describe("periodStart", () => {
	it("starts today, 6 days ago, on the 1st, or never", () => {
		expect(periodStart("today", "2026-11-09")).toBe("2026-11-09");
		expect(periodStart("7d", "2026-11-09")).toBe("2026-11-03");
		expect(periodStart("month", "2026-11-09")).toBe("2026-11-01");
		expect(periodStart("all", "2026-11-09")).toBe(null);
	});

	it("crosses months and years for the last 7 days", () => {
		expect(periodStart("7d", "2026-03-02")).toBe("2026-02-24");
		expect(periodStart("7d", "2027-01-03")).toBe("2026-12-28");
	});
});

describe("assertPayment", () => {
	const term = (overrides: Partial<SalesModel["body"]> = {}) =>
		body({
			paymentCondition: "term",
			paymentMethod: null,
			customerId: "c1",
			dueDate: "2026-11-30",
			...overrides,
		});

	it("takes a cash sale with a method, and a term sale with a customer and a due date", () => {
		expect(thrown(() => assertPayment(body()))).toBeUndefined();
		expect(thrown(() => assertPayment(term()))).toBeUndefined();
		expect(
			thrown(() => assertPayment(term({ dueDate: "2026-11-09" }))),
		).toBeUndefined();
	});

	it("asks a cash sale for the method and refuses a due date on it", () => {
		const noMethod = thrown(() => assertPayment(body({ paymentMethod: null })));
		const withDue = thrown(() =>
			assertPayment(body({ dueDate: "2026-11-30" })),
		);

		expect(noMethod).toMatchObject({
			code: 422,
			response: { field: "paymentMethod" },
		});
		expect(withDue).toMatchObject({
			code: 422,
			response: { field: "dueDate" },
		});
	});

	it("asks a term sale for the customer and the due date, and leaves the method for the payment", () => {
		const noCustomer = thrown(() => assertPayment(term({ customerId: null })));
		const withMethod = thrown(() =>
			assertPayment(term({ paymentMethod: "pix" })),
		);
		const noDue = thrown(() => assertPayment(term({ dueDate: null })));
		const noDueSent = thrown(() => assertPayment(term({ dueDate: undefined })));

		expect(noCustomer).toMatchObject({
			code: 422,
			response: { field: "customerId" },
		});
		expect(withMethod).toMatchObject({
			code: 422,
			response: { field: "paymentMethod" },
		});
		expect(noDue).toMatchObject({ code: 422, response: { field: "dueDate" } });
		expect(noDueSent).toMatchObject({
			code: 422,
			response: { field: "dueDate" },
		});
	});

	it("refuses a due date that isn't a day or comes before the sale", () => {
		const notADay = thrown(() =>
			assertPayment(term({ dueDate: "2026-02-30" })),
		);
		const before = thrown(() => assertPayment(term({ dueDate: "2026-11-08" })));

		expect(notADay).toMatchObject({
			code: 422,
			response: { field: "dueDate" },
		});
		expect(before).toMatchObject({ code: 422, response: { field: "dueDate" } });
	});
});

describe("paymentStatusOf", () => {
	const facts = (overrides: Partial<PaymentFacts> = {}): PaymentFacts => ({
		paymentCondition: "term",
		canceled: false,
		dueDate: "2026-11-20",
		paidAt: null,
		...overrides,
	});

	it("is unpaid up to the due date and overdue the day after", () => {
		expect(paymentStatusOf(facts(), "2026-11-19")).toBe("unpaid");
		expect(paymentStatusOf(facts(), "2026-11-20")).toBe("unpaid");
		expect(paymentStatusOf(facts(), "2026-11-21")).toBe("overdue");
	});

	it("is paid once it has a payment day, however late", () => {
		expect(paymentStatusOf(facts({ paidAt: "2026-11-25" }), "2026-12-30")).toBe(
			"paid",
		);
	});

	it("has no status for a cash sale or a canceled one", () => {
		const cash = facts({ paymentCondition: "cash", dueDate: null });

		expect(paymentStatusOf(cash, "2026-11-21")).toBeNull();
		expect(paymentStatusOf(facts({ canceled: true }), "2026-11-21")).toBeNull();
	});
});

describe("assertCanPay and assertCanUnpay", () => {
	const sale = (overrides: Partial<PayableSale> = {}): PayableSale => ({
		paymentCondition: "term",
		date: "2026-11-09",
		canceled: false,
		paidAt: null,
		...overrides,
	});
	const pay = { paidAt: "2026-11-12", paymentMethod: "pix" } as const;
	const today = "2026-11-15";

	it("pays an unpaid term sale on a day from the sale to today", () => {
		expect(thrown(() => assertCanPay(sale(), pay, today))).toBeUndefined();
		expect(
			thrown(() =>
				assertCanPay(sale(), { ...pay, paidAt: "2026-11-09" }, today),
			),
		).toBeUndefined();
		expect(
			thrown(() => assertCanPay(sale(), { ...pay, paidAt: today }, today)),
		).toBeUndefined();
	});

	it("refuses a payment day in the future, before the sale or that isn't a day", () => {
		const at = (paidAt: string) =>
			thrown(() => assertCanPay(sale(), { ...pay, paidAt }, today));

		expect(at("2026-11-16")).toMatchObject({
			code: 422,
			response: { field: "paidAt" },
		});
		expect(at("2026-11-08")).toMatchObject({
			code: 422,
			response: { field: "paidAt" },
		});
		expect(at("2026-02-30")).toMatchObject({
			code: 422,
			response: { field: "paidAt" },
		});
	});

	it("answers 409 for a canceled, cash or already paid sale", () => {
		const canceled = thrown(() =>
			assertCanPay(sale({ canceled: true }), pay, today),
		);
		const cash = thrown(() =>
			assertCanPay(sale({ paymentCondition: "cash" }), pay, today),
		);
		const paid = thrown(() =>
			assertCanPay(sale({ paidAt: "2026-11-10" }), pay, today),
		);

		expect(canceled).toMatchObject({
			code: 409,
			response: { code: "sale_canceled" },
		});
		expect(cash).toMatchObject({
			code: 409,
			response: { code: "sale_not_term" },
		});
		expect(paid).toMatchObject({
			code: 409,
			response: { code: "sale_already_paid" },
		});
	});

	it("takes a paid term sale back to unpaid, and refuses an unpaid, cash or canceled one", () => {
		const unpaid = thrown(() => assertCanUnpay(sale()));
		const cash = thrown(() =>
			assertCanUnpay(sale({ paymentCondition: "cash", paidAt: "2026-11-09" })),
		);
		const canceled = thrown(() =>
			assertCanUnpay(sale({ canceled: true, paidAt: "2026-11-10" })),
		);

		expect(thrown(() => assertCanUnpay(sale({ paidAt: "2026-11-10" })))).toBe(
			undefined,
		);
		expect(unpaid).toMatchObject({
			code: 409,
			response: { code: "sale_not_paid" },
		});
		expect(cash).toMatchObject({
			code: 409,
			response: { code: "sale_not_term" },
		});
		expect(canceled).toMatchObject({
			code: 409,
			response: { code: "sale_canceled" },
		});
	});
});
