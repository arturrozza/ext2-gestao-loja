import { describe, expect, it } from "bun:test";
import { thrown } from "../../../test/support/thrown";
import type { LockedProduct } from "../products/products.lock";
import {
	assertItems,
	assertPurchaseDate,
	summarizeLines,
} from "./purchases.rules";

const product = (overrides: Partial<LockedProduct> = {}): LockedProduct => ({
	id: "p1",
	name: "Perfume",
	hasExpiry: false,
	archived: false,
	...overrides,
});

const item = (
	overrides: {
		expiry?: string | null;
		productId?: string;
		lotCode?: string | null;
		manufacturedOn?: string | null;
	} = {},
) => ({
	productId: "p1",
	quantity: 1,
	unitCost: 1000,
	expiry: null,
	...overrides,
});

const check = (
	items: ReturnType<typeof item>[],
	products: LockedProduct[] = [product()],
) =>
	thrown(() =>
		assertItems(items, new Map(products.map((p) => [p.id, p])), "2026-11"),
	);

describe("assertPurchaseDate", () => {
	it("takes today and any day before", () => {
		expect(thrown(() => assertPurchaseDate("2026-11-09", "2026-11-09"))).toBe(
			undefined,
		);
		expect(thrown(() => assertPurchaseDate("2025-01-31", "2026-11-09"))).toBe(
			undefined,
		);
	});

	it("refuses a day that doesn't exist", () => {
		expect(
			thrown(() => assertPurchaseDate("2026-02-30", "2026-11-09")),
		).toMatchObject({ code: 422, response: { field: "date" } });
	});

	it("refuses a day before 2000, a typo", () => {
		expect(
			thrown(() => assertPurchaseDate("0000-01-01", "2026-11-09")),
		).toMatchObject({ code: 422, response: { field: "date" } });
	});

	it("refuses a day in the future", () => {
		expect(
			thrown(() => assertPurchaseDate("2026-11-10", "2026-11-09")),
		).toMatchObject({ code: 422, response: { field: "date" } });
	});
});

describe("assertItems", () => {
	it("takes lines of active products with the expiry they need", () => {
		const expiring = product({ id: "p2", hasExpiry: true });

		expect(
			check(
				[item(), item({ productId: "p2", expiry: "2026-11" })],
				[product(), expiring],
			),
		).toBe(undefined);
	});

	it("refuses a product that isn't in the store, on the line's field", () => {
		expect(check([item(), item({ productId: "nope" })])).toMatchObject({
			code: 422,
			response: { code: "product_not_found", field: "items.1.productId" },
		});
	});

	it("refuses an archived product", () => {
		expect(check([item()], [product({ archived: true })])).toMatchObject({
			code: 422,
			response: { code: "product_archived", field: "items.0.productId" },
		});
	});

	it("requires the expiry when the product has one", () => {
		expect(check([item()], [product({ hasExpiry: true })])).toMatchObject({
			response: { message: "Informe a validade.", field: "items.0.expiry" },
		});
	});

	it("refuses an expiry for a product without one", () => {
		expect(check([item({ expiry: "2027-01" })])).toMatchObject({
			response: {
				message: "Esse produto não tem validade.",
				field: "items.0.expiry",
			},
		});
	});

	it("refuses an expiry month already gone, but takes the current one", () => {
		const expiring = [product({ hasExpiry: true })];

		expect(check([item({ expiry: "2026-10" })], expiring)).toMatchObject({
			response: { message: "Essa validade já passou." },
		});
		expect(check([item({ expiry: "2026-11" })], expiring)).toBe(undefined);
	});
});

describe("assertItems: lot number and manufacture month", () => {
	const withExpiry = [product({ hasExpiry: true })];

	it("takes a lot number on a product with expiry, and a blank one on any product", () => {
		expect(
			check([item({ expiry: "2027-03", lotCode: "L2301" })], withExpiry),
		).toBeUndefined();
		expect(check([item({ lotCode: "   " })])).toBeUndefined();
		expect(check([item({ lotCode: null })])).toBeUndefined();
	});

	it("refuses a lot number on a product without expiry, on the line's field", () => {
		expect(check([item(), item({ lotCode: "L2301" })])).toMatchObject({
			code: 422,
			response: { field: "items.1.lotCode" },
		});
	});

	it("takes a manufacture month up to the current one, with or without expiry on the product", () => {
		expect(check([item({ manufacturedOn: "2026-11" })])).toBeUndefined();
		expect(check([item({ manufacturedOn: "2020-01" })])).toBeUndefined();
		expect(
			check(
				[item({ expiry: "2026-11", manufacturedOn: "2026-11" })],
				withExpiry,
			),
		).toBeUndefined();
	});

	it("refuses a manufacture month in the future, on the line's field", () => {
		const future = check([item(), item({ manufacturedOn: "2026-12" })]);

		expect(future).toMatchObject({
			code: 422,
			response: { field: "items.1.manufacturedOn" },
		});
	});
});

describe("summarizeLines", () => {
	const line = (productId: string, quantity: number, total: number) => ({
		productId,
		productName: `Produto ${productId}`,
		photoUrl: null,
		quantity,
		total,
	});

	it("counts lines, units and distinct products, and sums the total", () => {
		const summary = summarizeLines([
			line("a", 10, 92_000),
			line("a", 5, 50_000),
			line("b", 1, 0),
		]);

		expect(summary).toMatchObject({
			itemCount: 3,
			unitCount: 16,
			total: 142_000,
			productCount: 2,
		});
	});

	it("previews the first three distinct products in the order entered", () => {
		const summary = summarizeLines(
			["a", "b", "a", "c", "d"].map((id) => line(id, 1, 100)),
		);

		expect(summary.preview.map((preview) => preview.productId)).toEqual([
			"a",
			"b",
			"c",
		]);
		expect(summary.preview[0]).toEqual({
			productId: "a",
			name: "Produto a",
			photoUrl: null,
		});
	});
});
