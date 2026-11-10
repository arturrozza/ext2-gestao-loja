import { describe, expect, it } from "bun:test";
import {
	buildReport,
	type CostRow,
	type ItemRow,
	RANKING_SIZE,
	type ReportData,
	type SaleRow,
} from "./reports.rules";

const RANGE = { from: "2026-11-01", to: "2026-11-09" };

const sale = (id: string, overrides: Partial<SaleRow> = {}): SaleRow => ({
	id,
	date: "2026-11-05",
	channel: "store",
	resellerId: null,
	resellerName: null,
	revenue: 10_000,
	profit: 5000,
	productsCost: 4000,
	saleCosts: 1000,
	...overrides,
});

const item = (saleId: string, overrides: Partial<ItemRow> = {}): ItemRow => ({
	saleId,
	productId: "00000000-0000-4000-8000-000000000001",
	productName: "Blusa",
	categoryId: null,
	categoryName: null,
	quantity: 1,
	unitPrice: 10_000,
	cost: 4000,
	...overrides,
});

const cost = (
	saleId: string,
	kind: CostRow["kind"],
	amount: number,
): CostRow => ({ saleId, kind, amount });

const report = (data: Partial<ReportData>) =>
	buildReport({ sales: [], costs: [], items: [], ...data }, RANGE, "day");

describe("buildReport", () => {
	it("is all zeros and empty lists without sales, with the three channels and a bar per day", () => {
		const result = report({});

		expect(result.summary).toEqual({
			revenue: 0,
			profit: 0,
			margin: null,
			count: 0,
			averageTicket: 0,
		});
		expect(result.channels.map((row) => row.channel)).toEqual([
			"store",
			"mercado_livre",
			"reseller",
		]);
		expect(result.evolution).toHaveLength(9);
		expect(result.products.bestSellers).toEqual([]);
		expect(result.categories).toEqual([]);
		expect(result.resellers).toEqual([]);
	});

	it("sums the summary and rounds the average ticket to the cent", () => {
		const result = report({
			sales: [
				sale("a", { revenue: 10_000, profit: 6000 }),
				sale("b", { revenue: 10_001, profit: -500 }),
				sale("c", { revenue: 10_001, profit: 0 }),
			],
			items: [item("a"), item("b"), item("c")],
		});

		expect(result.summary).toMatchObject({
			revenue: 30_002,
			profit: 5500,
			count: 3,
			// 30 002 ÷ 3 = 10 000,67
			averageTicket: 10_001,
		});
		expect(result.summary.margin).toBeCloseTo(5500 / 30_002);
	});

	it("breaks the costs down by kind, with products first, so costs + profit = revenue", () => {
		const result = report({
			sales: [
				sale("a", {
					revenue: 10_000,
					productsCost: 4000,
					saleCosts: 1500,
					profit: 4500,
				}),
			],
			items: [item("a")],
			costs: [
				cost("a", "freight", 500),
				cost("a", "platform_fee", 400),
				cost("a", "commission", 300),
				cost("a", "other", 300),
			],
		});

		expect(result.costs).toEqual({
			products: 4000,
			freight: 500,
			tax: 0,
			fees: 400,
			commissions: 300,
			other: 300,
		});
	});

	it("groups the evolution by day and puts the sales in their bar", () => {
		const result = report({
			sales: [
				sale("a", { date: "2026-11-05", revenue: 100, profit: 10 }),
				sale("b", { date: "2026-11-05", revenue: 200, profit: 20 }),
				sale("c", { date: "2026-11-09", revenue: 50, profit: -5 }),
			],
			items: [
				item("a", { unitPrice: 100 }),
				item("b", { unitPrice: 200 }),
				item("c", { unitPrice: 50 }),
			],
		});

		expect(result.evolution.find((bar) => bar.date === "2026-11-05")).toEqual({
			date: "2026-11-05",
			revenue: 300,
			profit: 30,
		});
		expect(result.evolution.at(-1)).toEqual({
			date: "2026-11-09",
			revenue: 50,
			profit: -5,
		});
		expect(result.evolution[0]).toEqual({
			date: "2026-11-01",
			revenue: 0,
			profit: 0,
		});
	});

	it("totals each channel", () => {
		const result = report({
			sales: [
				sale("a", { channel: "store", revenue: 100, profit: 10 }),
				sale("b", { channel: "mercado_livre", revenue: 200, profit: 20 }),
				sale("c", { channel: "mercado_livre", revenue: 50, profit: 5 }),
			],
			items: [
				item("a", { unitPrice: 100 }),
				item("b", { unitPrice: 200 }),
				item("c", { unitPrice: 50 }),
			],
		});

		expect(result.channels).toEqual([
			{ channel: "store", revenue: 100, profit: 10 },
			{ channel: "mercado_livre", revenue: 250, profit: 25 },
			{ channel: "reseller", revenue: 0, profit: 0 },
		]);
	});

	it("totals each reseller's sales and commission, the one who sold the most first", () => {
		const ana = "00000000-0000-4000-8000-0000000000a1";
		const bia = "00000000-0000-4000-8000-0000000000b1";
		const result = report({
			sales: [
				sale("a", {
					channel: "reseller",
					resellerId: bia,
					resellerName: "Bia",
					revenue: 100,
				}),
				sale("b", {
					channel: "reseller",
					resellerId: ana,
					resellerName: "Ana",
					revenue: 300,
				}),
				sale("c", {
					channel: "reseller",
					resellerId: ana,
					resellerName: "Ana",
					revenue: 100,
				}),
				sale("d", { revenue: 999 }),
			],
			items: [item("a"), item("b"), item("c"), item("d")],
			costs: [
				cost("a", "commission", 10),
				cost("b", "commission", 30),
				cost("c", "commission", 10),
				// Only the commission counts, not her other costs.
				cost("b", "freight", 50),
			],
		});

		expect(result.resellers).toEqual([
			{ id: ana, name: "Ana", revenue: 400, commission: 40 },
			{ id: bia, name: "Bia", revenue: 100, commission: 10 },
		]);
	});

	it("ranks the products and leaves a product that was only given away out of the margin rankings", () => {
		const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
		const result = report({
			sales: [
				sale("a", {
					revenue: 10_000,
					productsCost: 4000,
					saleCosts: 0,
					profit: 6000,
				}),
				sale("b", {
					revenue: 0,
					productsCost: 500,
					saleCosts: 0,
					profit: -500,
				}),
			],
			items: [
				item("a", {
					productId: id(1),
					productName: "Blusa",
					quantity: 1,
					unitPrice: 10_000,
					cost: 4000,
				}),
				item("b", {
					productId: id(2),
					productName: "Brinde",
					quantity: 5,
					unitPrice: 0,
					cost: 500,
				}),
			],
		});

		expect(result.products.bestSellers.map((row) => row.name)).toEqual([
			"Brinde",
			"Blusa",
		]);
		expect(result.products.worstSellers.map((row) => row.name)).toEqual([
			"Blusa",
			"Brinde",
		]);
		expect(result.products.bestMargin).toEqual([
			{
				productId: id(1),
				name: "Blusa",
				quantity: 1,
				revenue: 10_000,
				margin: 0.6,
			},
		]);
		expect(result.products.worstMargin).toHaveLength(1);
	});

	it("shows only the top few of each ranking and breaks ties by name", () => {
		const items = Array.from({ length: RANKING_SIZE + 2 }, (_, n) =>
			item("a", {
				productId: `00000000-0000-4000-8000-00000000010${n}`,
				productName: `Produto ${String.fromCharCode(71 - n)}`,
				cost: 0,
			}),
		);
		const result = report({
			sales: [
				sale("a", {
					revenue: 7 * 10_000,
					productsCost: 0,
					saleCosts: 0,
					profit: 7 * 10_000,
				}),
			],
			items,
		});

		expect(result.products.bestSellers).toHaveLength(RANKING_SIZE);
		// Everything ties on units and revenue: alphabetical.
		expect(result.products.bestSellers.map((row) => row.name)).toEqual([
			"Produto A",
			"Produto B",
			"Produto C",
			"Produto D",
			"Produto E",
		]);
	});

	it("totals the categories, with the products of none as one line", () => {
		const hair = "00000000-0000-4000-8000-0000000000c1";
		const result = report({
			sales: [
				sale("a", {
					revenue: 10_000,
					productsCost: 4000,
					saleCosts: 1000,
					profit: 5000,
				}),
			],
			items: [
				item("a", {
					productId: "00000000-0000-4000-8000-000000000001",
					categoryId: hair,
					categoryName: "Cabelo",
					unitPrice: 6000,
					cost: 2000,
				}),
				item("a", {
					productId: "00000000-0000-4000-8000-000000000002",
					unitPrice: 4000,
					cost: 2000,
				}),
			],
		});

		expect(result.categories).toEqual([
			{ id: hair, name: "Cabelo", revenue: 6000, profit: 6000 - 2000 - 600 },
			{
				id: null,
				name: "Sem categoria",
				revenue: 4000,
				profit: 4000 - 2000 - 400,
			},
		]);
	});

	it("fails loudly on a sale with no lines", () => {
		expect(() => report({ sales: [sale("a")] })).toThrow("has no lines");
	});
});
