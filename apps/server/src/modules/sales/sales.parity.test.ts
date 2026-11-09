import { describe, expect, it } from "bun:test";
// The app has no test runner yet (docs/testing.md); its sale math is plain TypeScript, so it's tested here: the live
// result of the new sale screen has to show what the API records.
import { computeSale } from "../../../../mobile/src/lib/sale-math";
import { computeTotals } from "./sales.rules";

type Case = {
	items: { quantity: number; unitPrice: number; unitCost: number }[];
	discount: number;
	surcharge: number;
	costs: { mode: "amount" | "percent"; value: number }[];
};

const cases: Case[] = [
	// The acceptance example: R$ 180 revenue, R$ 67 profit.
	{
		items: [{ quantity: 2, unitPrice: 10_000, unitCost: 4000 }],
		discount: 2000,
		surcharge: 0,
		costs: [
			{ mode: "amount", value: 1500 },
			{ mode: "percent", value: 1000 },
		],
	},
	// Percentages that round, a surcharge and a gift at zero.
	{
		items: [
			{ quantity: 3, unitPrice: 3333, unitCost: 1250 },
			{ quantity: 1, unitPrice: 0, unitCost: 199 },
		],
		discount: 0,
		surcharge: 101,
		costs: [
			{ mode: "percent", value: 1250 },
			{ mode: "percent", value: 333 },
		],
	},
	// A loss, and a sale fully discounted.
	{
		items: [{ quantity: 1, unitPrice: 5000, unitCost: 8000 }],
		discount: 5000,
		surcharge: 0,
		costs: [{ mode: "amount", value: 990 }],
	},
];

describe("app and server sale math", () => {
	it("give the same revenue, cost amounts, products cost and profit", () => {
		for (const sale of cases) {
			const app = computeSale({
				items: sale.items.map((item) => ({
					quantity: item.quantity,
					unitPriceCents: item.unitPrice,
					unitCostCents: item.unitCost,
				})),
				discountCents: sale.discount,
				surchargeCents: sale.surcharge,
				costs: sale.costs,
			});
			const server = computeTotals({
				lines: sale.items.map((item) => ({
					quantity: item.quantity,
					unitPrice: item.unitPrice,
					cost: item.quantity * item.unitCost,
				})),
				discount: sale.discount,
				surcharge: sale.surcharge,
				costs: sale.costs,
			});

			expect(app.revenueCents).toBe(server.revenue);
			expect(app.costAmountsCents).toEqual(
				server.costs.map((cost) => cost.amount),
			);
			expect(app.productsCostCents).toBe(server.productsCost);
			expect(app.saleCostsCents).toBe(server.saleCosts);
			expect(app.profitCents).toBe(server.profit);
		}
	});
});
