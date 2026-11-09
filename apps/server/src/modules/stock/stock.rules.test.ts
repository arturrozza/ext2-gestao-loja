import { describe, expect, it } from "bun:test";
import { MAX_CENTS } from "../../lib/money";
import {
	afterEntry,
	averageCost,
	EMPTY_STOCK,
	fitsStock,
	planEntries,
	planPurchaseCancellation,
	planSaleExit,
	planSaleReturns,
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

describe("planPurchaseCancellation", () => {
	const line = (
		purchaseItemId: string,
		quantity: number,
		unitCost: number,
	) => ({
		productId: "a",
		purchaseItemId,
		lotId: `lot-${purchaseItemId}`,
		quantity,
		unitCost,
	});
	/** Every lot still with all the units its line brought, or as given. */
	const full = (
		lines: ReturnType<typeof line>[],
		left: Record<string, number> = {},
	) =>
		new Map(
			lines.map((entry) => [entry.lotId, left[entry.lotId] ?? entry.quantity]),
		);
	const plan = (
		balance: { quantity: number; value: number },
		lines: ReturnType<typeof line>[],
		left?: Record<string, number>,
	) =>
		planPurchaseCancellation(
			new Map([["a", balance]]),
			full(lines, left),
			lines,
		);

	it("takes back exactly what each line brought, chaining lines of the same product", () => {
		// 10 at R$ 92, then 10 at R$ 100 and 5 at R$ 0 in the purchase canceled.
		const planned = plan({ quantity: 25, value: 192_000 }, [
			line("i1", 10, 10_000),
			line("i2", 5, 0),
		]);

		expect(planned?.map((entry) => entry.movement)).toEqual([
			{
				quantity: -10,
				unitCost: 10_000,
				valueChange: -100_000,
				stockAfter: 15,
				averageCostAfter: 6133,
			},
			{
				quantity: -5,
				unitCost: 0,
				valueChange: 0,
				stockAfter: 10,
				averageCostAfter: 9200,
			},
		]);
	});

	it("takes the whole value when no unit is left", () => {
		const planned = plan({ quantity: 4, value: 3000 }, [line("i1", 4, 1000)]);

		expect(planned?.[0]?.movement).toMatchObject({
			valueChange: -3000,
			stockAfter: 0,
			averageCostAfter: 0,
		});
	});

	it("never takes more than the stock is worth", () => {
		// A gift at R$ 0 sold at the average of R$ 5, then the R$ 10 purchase canceled with units still in stock.
		const planned = plan({ quantity: 3, value: 500 }, [line("i1", 1, 1000)]);

		expect(planned?.[0]?.movement).toMatchObject({
			valueChange: -500,
			stockAfter: 2,
			averageCostAfter: 0,
		});
	});

	it("refuses when a unit of any line already left its lot", () => {
		const planned = plan(
			{ quantity: 20, value: 20_000 },
			[line("i1", 10, 1000), line("i2", 10, 1000)],
			{ "lot-i2": 9 },
		);

		expect(planned).toBeNull();
	});
});

describe("planSaleReturns", () => {
	const line = (productId: string, quantity: number, cost: number) => ({
		productId,
		quantity,
		cost,
	});
	const movementsOf = (
		balances: [string, { quantity: number; value: number }][],
		lines: ReturnType<typeof line>[],
	) =>
		planSaleReturns(new Map(balances), lines)?.map((entry) => entry.movement) ??
		null;

	it("brings the units back at their share of the value: the average cost stays", () => {
		// 5 left at R$ 96 each; 3 sold come back.
		expect(
			movementsOf(
				[["a", { quantity: 5, value: 48_000 }]],
				[line("a", 3, 28_800)],
			),
		).toEqual([
			{
				quantity: 3,
				unitCost: 9600,
				valueChange: 28_800,
				stockAfter: 8,
				averageCostAfter: 9600,
			},
		]);
	});

	it("keeps an average with a fraction of a cent, rounding the value brought back once", () => {
		// R$ 10 in 3 units: 1 coming back brings 333 cents (1000 × 1 ÷ 3).
		expect(
			movementsOf([["a", { quantity: 3, value: 1000 }]], [line("a", 1, 400)]),
		).toMatchObject([
			{ valueChange: 333, stockAfter: 4, averageCostAfter: 333 },
		]);
	});

	it("brings back what the sale took when there's no stock left, and chains lines of the same product", () => {
		expect(movementsOf([], [line("a", 2, 9200), line("a", 2, 0)])).toEqual([
			{
				quantity: 2,
				unitCost: 4600,
				valueChange: 9200,
				stockAfter: 2,
				averageCostAfter: 4600,
			},
			{
				quantity: 2,
				unitCost: 4600,
				valueChange: 9200,
				stockAfter: 4,
				averageCostAfter: 4600,
			},
		]);
	});

	it("refuses units that would take the stock past what a movement holds", () => {
		expect(
			movementsOf(
				[["a", { quantity: 1, value: MAX_CENTS }]],
				[line("b", 1, 100), line("a", 1, MAX_CENTS)],
			),
		).toBeNull();
	});
});
