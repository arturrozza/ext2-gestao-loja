import { describe, expect, it } from "bun:test";
import { allocate, resultOfLines, type SaleLine } from "./reports.allocation";

const total = (values: number[]) =>
	values.reduce((acc, value) => acc + value, 0);

describe("allocate", () => {
	it("splits in proportion to the weights", () => {
		expect(allocate(1000, [8000, 2000])).toEqual([800, 200]);
	});

	it("gives the leftover cents to the biggest fractions, the earlier line first on a tie", () => {
		expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33]);
		// 1 cent over 1:3 → 0,25 and 0,75: the second one's fraction is bigger.
		expect(allocate(1, [1, 3])).toEqual([0, 1]);
	});

	it("gives the leftover to the heavier line when the fractions tie", () => {
		// 2 cents over 1:3 → 0,5 and 1,5: both lose half a cent, and the heavier line takes the one left.
		expect(allocate(2, [1, 3])).toEqual([0, 2]);
		// Same fractions and weights: the earlier line.
		expect(allocate(1, [5, 5])).toEqual([1, 0]);
	});

	it("gives a line without weight nothing", () => {
		expect(allocate(500, [0, 10])).toEqual([0, 500]);
		expect(allocate(0, [3, 7])).toEqual([0, 0]);
	});

	it("always adds up to the total, even with values that outgrow a safe integer when multiplied", () => {
		const weights = [200_000_000_000_000, 199_999_999_999_999, 1];
		const cases = [
			[2_147_483_647, weights],
			[7, [1, 1, 1, 1]],
			[99, [3, 3, 3, 1]],
		] as const;
		for (const [value, parts] of cases) {
			expect(total(allocate(value, [...parts]))).toBe(value);
		}
	});

	it("refuses a negative total and weights that add up to zero", () => {
		expect(() => allocate(-1, [1])).toThrow(RangeError);
		expect(() => allocate(10, [0, 0])).toThrow(RangeError);
	});
});

const line = (overrides: Partial<SaleLine> = {}): SaleLine => ({
	productId: "p1",
	productName: "Blusa",
	categoryId: null,
	categoryName: null,
	quantity: 1,
	unitPrice: 8000,
	cost: 3000,
	...overrides,
});

describe("resultOfLines", () => {
	it("shares the revenue and the costs by the value of each line", () => {
		// R$ 80 + R$ 20 = R$ 100 and R$ 10 of costs; the products cost R$ 30 and R$ 5.
		const results = resultOfLines({ revenue: 10_000, saleCosts: 1000 }, [
			line({ productId: "blusa", unitPrice: 8000, cost: 3000 }),
			line({ productId: "colar", unitPrice: 2000, cost: 500 }),
		]);

		expect(results.map(({ revenue, profit }) => ({ revenue, profit }))).toEqual(
			[
				{ revenue: 8000, profit: 8000 - 3000 - 800 },
				{ revenue: 2000, profit: 2000 - 500 - 200 },
			],
		);
	});

	it("shares the discount too: the revenue is already net of it", () => {
		// R$ 200 of lines, R$ 20 of discount → R$ 180 of revenue, 90 each.
		const results = resultOfLines({ revenue: 18_000, saleCosts: 0 }, [
			line({ productId: "a", unitPrice: 10_000, cost: 4000 }),
			line({ productId: "b", unitPrice: 10_000, cost: 4000 }),
		]);

		expect(results.map((result) => result.revenue)).toEqual([9000, 9000]);
	});

	it("gives a gift none of the revenue or the costs, only its own product cost", () => {
		const results = resultOfLines({ revenue: 10_000, saleCosts: 1000 }, [
			line({ productId: "blusa", unitPrice: 10_000, cost: 4000 }),
			line({ productId: "brinde", unitPrice: 0, cost: 500 }),
		]);

		expect(results[1]).toMatchObject({ revenue: 0, profit: -500 });
		expect(results[0]).toMatchObject({ revenue: 10_000, profit: 5000 });
	});

	it("splits by units when every line is a gift", () => {
		// All the revenue is a surcharge: there's no value to go by.
		const results = resultOfLines({ revenue: 400, saleCosts: 0 }, [
			line({ productId: "a", quantity: 1, unitPrice: 0, cost: 0 }),
			line({ productId: "b", quantity: 3, unitPrice: 0, cost: 0 }),
		]);

		expect(results.map((result) => result.revenue)).toEqual([100, 300]);
	});

	it("keeps the profits adding up to the sale's profit", () => {
		const lines = [
			line({ productId: "a", quantity: 3, unitPrice: 3333, cost: 1001 }),
			line({ productId: "b", quantity: 2, unitPrice: 777, cost: 333 }),
			line({ productId: "c", quantity: 1, unitPrice: 0, cost: 90 }),
		];
		const revenue = 3 * 3333 + 2 * 777 - 123;
		const saleCosts = 1001;
		const productsCost = 1001 + 333 + 90;

		const results = resultOfLines({ revenue, saleCosts }, lines);

		expect(total(results.map((result) => result.revenue))).toBe(revenue);
		expect(total(results.map((result) => result.profit))).toBe(
			revenue - productsCost - saleCosts,
		);
	});
});
