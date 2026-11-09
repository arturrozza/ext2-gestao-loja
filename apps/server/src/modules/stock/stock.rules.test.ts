import { describe, expect, it } from "bun:test";
import { MAX_CENTS } from "../../lib/money";
import {
	afterEntry,
	averageCost,
	EMPTY_STOCK,
	fitsStock,
	planEntries,
	planSaleExit,
	stockFlags,
	stockSummary,
} from "./stock.rules";

describe("averageCost", () => {
	it("is zero without stock", () => {
		expect(averageCost(EMPTY_STOCK)).toBe(0);
	});

	it("is the value over the quantity, rounded to the cent", () => {
		expect(averageCost({ quantity: 20, value: 192_000 })).toBe(9600);
		// R$ 10 in 3 units: R$ 3,33 each, R$ 20 in 3: R$ 6,67.
		expect(averageCost({ quantity: 3, value: 1000 })).toBe(333);
		expect(averageCost({ quantity: 3, value: 2000 })).toBe(667);
	});
});

describe("afterEntry", () => {
	it("averages 10 units at R$ 92 and 10 at R$ 100 to R$ 96", () => {
		const first = afterEntry(EMPTY_STOCK, { quantity: 10, unitCost: 9200 });
		const second = afterEntry(first, { quantity: 10, unitCost: 10_000 });

		expect(second).toEqual({ quantity: 20, value: 192_000 });
		expect(averageCost(second)).toBe(9600);
	});

	it("takes the entry's cost when there's no stock", () => {
		const after = afterEntry(EMPTY_STOCK, { quantity: 4, unitCost: 1250 });

		expect(averageCost(after)).toBe(1250);
	});

	it("keeps the exact value, so rounding never builds up", () => {
		let balance = afterEntry(EMPTY_STOCK, { quantity: 3, unitCost: 333 });
		balance = afterEntry(balance, { quantity: 1, unitCost: 0 });
		balance = afterEntry(balance, { quantity: 2, unitCost: 334 });

		expect(balance).toEqual({ quantity: 6, value: 1667 });
		expect(averageCost(balance)).toBe(278);
	});

	it("lets a free entry lower the average", () => {
		const paid = afterEntry(EMPTY_STOCK, { quantity: 1, unitCost: 1000 });

		expect(averageCost(afterEntry(paid, { quantity: 1, unitCost: 0 }))).toBe(
			500,
		);
	});
});

describe("fitsStock", () => {
	it("takes units and value up to what an integer column holds", () => {
		const max = 2_147_483_647;
		expect(fitsStock({ quantity: max, value: MAX_CENTS })).toBe(true);
		expect(fitsStock({ quantity: 1, value: MAX_CENTS + 1 })).toBe(false);
		expect(fitsStock({ quantity: max + 1, value: 0 })).toBe(false);
	});
});

describe("planEntries", () => {
	it("chains entries of the same product from the current balance", () => {
		const balances = new Map([["a", { quantity: 10, value: 92_000 }]]);

		const plan = planEntries(balances, [
			{ productId: "a", quantity: 10, unitCost: 10_000 },
			{ productId: "b", quantity: 2, unitCost: 500 },
			{ productId: "a", quantity: 5, unitCost: 0 },
		]);

		expect(plan).toEqual({
			movements: [
				{
					productId: "a",
					quantity: 10,
					unitCost: 10_000,
					valueChange: 100_000,
					stockAfter: 20,
					averageCostAfter: 9600,
				},
				{
					productId: "b",
					quantity: 2,
					unitCost: 500,
					valueChange: 1000,
					stockAfter: 2,
					averageCostAfter: 500,
				},
				{
					productId: "a",
					quantity: 5,
					unitCost: 0,
					valueChange: 0,
					stockAfter: 25,
					averageCostAfter: 7680,
				},
			],
		});
		expect(balances.get("a")).toEqual({ quantity: 10, value: 92_000 });
	});

	it("points at the first entry that would pass the value limit", () => {
		const balances = new Map([["a", { quantity: 1, value: MAX_CENTS - 10 }]]);

		const plan = planEntries(balances, [
			{ productId: "b", quantity: 1, unitCost: MAX_CENTS },
			{ productId: "a", quantity: 1, unitCost: 10 },
			{ productId: "a", quantity: 1, unitCost: 1 },
		]);

		expect(plan).toEqual({ overflowAt: 2 });
	});
});

describe("stockFlags", () => {
	it("is out of stock at zero, and not low then", () => {
		expect(stockFlags(0, 5)).toEqual({ lowStock: false, outOfStock: true });
	});

	it("is low at or below the minimum", () => {
		expect(stockFlags(5, 5).lowStock).toBe(true);
		expect(stockFlags(4, 5).lowStock).toBe(true);
		expect(stockFlags(6, 5).lowStock).toBe(false);
	});

	it("is never low without a minimum", () => {
		expect(stockFlags(1, null)).toEqual({
			lowStock: false,
			outOfStock: false,
		});
	});
});

describe("stockSummary", () => {
	it("adds the average cost and the states to the figures", () => {
		expect(
			stockSummary(
				{
					stock: 3,
					sellableStock: 2,
					stockValue: 1000,
					nearExpiry: true,
					expired: true,
				},
				3,
			),
		).toEqual({
			stock: 3,
			sellableStock: 2,
			stockValue: 1000,
			averageCost: 333,
			flags: {
				lowStock: true,
				outOfStock: false,
				nearExpiry: true,
				expired: true,
			},
		});
	});
});

describe("planSaleExit", () => {
	const lots = [
		{ id: "soon", quantity: 2 },
		{ id: "later", quantity: 5 },
	];

	it("takes the lots in order, at the average cost", () => {
		const plan = planSaleExit({ quantity: 7, value: 28_000 }, lots, 3);

		expect(plan).toEqual({
			takes: [
				{ lotId: "soon", units: 2 },
				{ lotId: "later", units: 1 },
			],
			movement: {
				quantity: -3,
				unitCost: 4000,
				valueChange: -12_000,
				stockAfter: 4,
				averageCostAfter: 4000,
			},
		});
	});

	it("takes only the first lot when it has them all", () => {
		const plan = planSaleExit({ quantity: 7, value: 28_000 }, lots, 2);

		expect(plan?.takes).toEqual([{ lotId: "soon", units: 2 }]);
	});

	it("takes the whole value with the last unit", () => {
		// R$ 10 in 3 units: R$ 3,33 each, and the last one takes the cent left.
		const plan = planSaleExit(
			{ quantity: 3, value: 1000 },
			[{ id: "a", quantity: 3 }],
			3,
		);

		expect(plan?.movement).toMatchObject({
			valueChange: -1000,
			unitCost: 333,
			stockAfter: 0,
			averageCostAfter: 0,
		});
	});

	it("is null when the sellable lots don't have the units", () => {
		// 10 units in stock, but only 7 sellable (the rest expired).
		expect(planSaleExit({ quantity: 10, value: 40_000 }, lots, 8)).toBe(null);
	});
});
