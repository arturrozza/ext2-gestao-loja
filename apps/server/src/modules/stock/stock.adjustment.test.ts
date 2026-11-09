import { describe, expect, it } from "bun:test";
import { thrown } from "../../../test/support/thrown";
import {
	type AdjustmentInput,
	planAdjustment,
	planCostCorrection,
} from "./stock.adjustment";
import type { OpenLot } from "./stock.rules";

const lot = (overrides: Partial<OpenLot> = {}): OpenLot => ({
	id: "lot",
	expiry: null,
	quantity: 10,
	expired: false,
	...overrides,
});

const input = (overrides: Partial<AdjustmentInput> = {}): AdjustmentInput => ({
	newQuantity: 8,
	reason: "loss",
	note: null,
	expiry: null,
	...overrides,
});

/** 10 units worth R$ 920: R$ 92 each. */
const balance = { quantity: 10, value: 92_000 };

/** The 422 a call throws, as `{ code, field }`. */
function refusal(call: () => unknown) {
	const error = thrown(call) as {
		code?: number;
		response?: { code: string; field?: string };
	};
	expect(error?.code).toBe(422);
	return { code: error.response?.code, field: error.response?.field };
}

describe("planAdjustment going down", () => {
	it("takes the units at the average cost: 10 → 8 is −2 and −R$ 184", () => {
		const plan = planAdjustment(balance, [lot()], false, input());

		expect(plan).toEqual({
			movement: {
				quantity: -2,
				unitCost: 9200,
				valueChange: -18_400,
				stockAfter: 8,
				averageCostAfter: 9200,
			},
			reason: "loss",
			note: null,
			takes: [{ lotId: "lot", units: 2 }],
			newLot: null,
		});
	});

	it("takes the whole value when the stock goes to zero", () => {
		const plan = planAdjustment(
			{ quantity: 3, value: 1000 },
			[lot({ quantity: 3 })],
			false,
			input({ newQuantity: 0 }),
		);

		expect(plan.movement).toMatchObject({
			valueChange: -1000,
			stockAfter: 0,
			averageCostAfter: 0,
		});
	});

	it("never takes more value than there is", () => {
		// 4 units worth 2 cents: 1 cent each once rounded, but 3 of them can't take 3 cents.
		const plan = planAdjustment(
			{ quantity: 4, value: 2 },
			[lot({ quantity: 4 })],
			false,
			input({ newQuantity: 1 }),
		);

		expect(plan.movement.valueChange).toBe(-2);
	});

	it("takes from the oldest lots of the chosen expiry", () => {
		const lots = [
			lot({ id: "a", expiry: "2027-03", quantity: 2 }),
			lot({ id: "b", expiry: "2027-08", quantity: 3 }),
			lot({ id: "c", expiry: "2027-08", quantity: 5 }),
		];

		const plan = planAdjustment(
			balance,
			lots,
			true,
			input({ newQuantity: 6, fromExpiry: "2027-08" }),
		);

		expect(plan.takes).toEqual([
			{ lotId: "b", units: 3 },
			{ lotId: "c", units: 1 },
		]);
	});

	it("asks where the units left from when there's more than one expiry", () => {
		const lots = [
			lot({ id: "a", expiry: "2027-03", quantity: 5 }),
			lot({ id: "b", expiry: null, quantity: 5 }),
		];

		expect(refusal(() => planAdjustment(balance, lots, true, input()))).toEqual(
			{ code: "validation", field: "fromExpiry" },
		);
		// `null` is a choice: the units without expiry.
		expect(
			planAdjustment(balance, lots, true, input({ fromExpiry: null })).takes,
		).toEqual([{ lotId: "b", units: 2 }]);
	});

	it("takes from every lot, with no choice, when the stock goes to zero", () => {
		const lots = [
			lot({ id: "a", expiry: "2027-03", quantity: 4 }),
			lot({ id: "b", expiry: "2027-08", quantity: 6 }),
		];

		const plan = planAdjustment(balance, lots, true, input({ newQuantity: 0 }));

		expect(plan.takes).toEqual([
			{ lotId: "a", units: 4 },
			{ lotId: "b", units: 6 },
		]);
	});

	it("refuses more units than the chosen expiry has, or one without units", () => {
		const lots = [
			lot({ id: "a", expiry: "2027-03", quantity: 3 }),
			lot({ id: "b", expiry: "2027-08", quantity: 7 }),
		];
		const message = (fromExpiry: string) =>
			(
				thrown(() =>
					planAdjustment(
						balance,
						lots,
						true,
						input({ newQuantity: 2, fromExpiry }),
					),
				) as { response?: { message: string; field?: string } }
			).response;

		expect(message("2027-03")).toMatchObject({
			field: "fromExpiry",
			message: "Essa validade só tem 3 unidades.",
		});
		expect(message("2030-01")).toMatchObject({
			field: "fromExpiry",
			message: "Não há unidades com essa validade.",
		});
	});

	it("discards as expired only expired units", () => {
		const lots = [
			lot({ id: "a", expiry: "2026-01", quantity: 3, expired: true }),
			lot({ id: "b", expiry: "2027-08", quantity: 7 }),
		];
		const discard = (fromExpiry: string) =>
			planAdjustment(
				balance,
				lots,
				true,
				input({ newQuantity: 7, reason: "expired_discarded", fromExpiry }),
			);

		expect(discard("2026-01").takes).toEqual([{ lotId: "a", units: 3 }]);
		expect(refusal(() => discard("2027-08"))).toEqual({
			code: "validation",
			field: "reason",
		});
	});
});

describe("planAdjustment going up", () => {
	const up = (overrides: Partial<AdjustmentInput> = {}) =>
		input({ newQuantity: 12, reason: "count", ...overrides });

	it("adds the units at the average cost, which stays", () => {
		const plan = planAdjustment(balance, [lot()], false, up());

		expect(plan).toMatchObject({
			movement: {
				quantity: 2,
				unitCost: 9200,
				valueChange: 18_400,
				stockAfter: 12,
				averageCostAfter: 9200,
			},
			takes: [],
			newLot: { expiry: null, quantity: 2 },
		});
	});

	it("keeps the exact average: R$ 10 in 3 units plus 3 is R$ 20 in 6", () => {
		const plan = planAdjustment(
			{ quantity: 3, value: 1000 },
			[lot({ quantity: 3 })],
			false,
			up({ newQuantity: 6 }),
		);

		expect(plan.movement).toMatchObject({
			valueChange: 1000,
			averageCostAfter: 333,
		});
	});

	it("takes the expiry of the new units, a past month too", () => {
		const plan = planAdjustment(
			balance,
			[lot()],
			true,
			up({ expiry: "2020-01" }),
		);

		expect(plan.newLot).toEqual({ expiry: "2020-01", quantity: 2 });
	});

	it("asks for the expiry only on a product with expiry", () => {
		expect(refusal(() => planAdjustment(balance, [lot()], true, up()))).toEqual(
			{ code: "validation", field: "expiry" },
		);
		expect(
			refusal(() =>
				planAdjustment(balance, [lot()], false, up({ expiry: "2027-01" })),
			),
		).toEqual({ code: "validation", field: "expiry" });
	});

	it("only counts or other reasons add units", () => {
		expect(
			refusal(() =>
				planAdjustment(balance, [lot()], false, up({ reason: "loss" })),
			),
		).toEqual({ code: "validation", field: "reason" });
	});

	it("refuses units without stock: there's no cost to give them", () => {
		expect(
			refusal(() =>
				planAdjustment(
					{ quantity: 0, value: 0 },
					[],
					false,
					up({ newQuantity: 2 }),
				),
			),
		).toEqual({ code: "no_stock_cost", field: "newQuantity" });
	});

	it("adds up to 100.000 units at once", () => {
		expect(
			planAdjustment(balance, [lot()], false, up({ newQuantity: 100_010 }))
				.newLot,
		).toEqual({ expiry: null, quantity: 100_000 });
		expect(
			refusal(() =>
				planAdjustment(balance, [lot()], false, up({ newQuantity: 100_011 })),
			),
		).toEqual({ code: "validation", field: "newQuantity" });
	});

	it("refuses a value past what the ledger holds", () => {
		expect(
			refusal(() =>
				planAdjustment(
					{ quantity: 1, value: 2_000_000_000 },
					[lot({ quantity: 1 })],
					false,
					up({ newQuantity: 2 }),
				),
			),
		).toEqual({ code: "stock_limit", field: "newQuantity" });
	});
});

describe("planAdjustment", () => {
	it("refuses the same quantity", () => {
		expect(
			refusal(() =>
				planAdjustment(balance, [lot()], false, input({ newQuantity: 10 })),
			),
		).toEqual({ code: "validation", field: "newQuantity" });
	});

	it("needs a note for other, and keeps it trimmed", () => {
		expect(
			refusal(() =>
				planAdjustment(
					balance,
					[lot()],
					false,
					input({ reason: "other", note: "  " }),
				),
			),
		).toEqual({ code: "validation", field: "note" });
		expect(
			planAdjustment(
				balance,
				[lot()],
				false,
				input({ reason: "other", note: " achado " }),
			).note,
		).toBe("achado");
	});
});

describe("planCostCorrection", () => {
	it("sets the new cost on every unit: R$ 92 → R$ 88 on 10 is −R$ 40", () => {
		expect(planCostCorrection(balance, 8800, " nota errada ")).toEqual({
			movement: {
				quantity: 0,
				unitCost: 8800,
				valueChange: -4000,
				stockAfter: 10,
				averageCostAfter: 8800,
			},
			note: "nota errada",
		});
	});

	it("refuses without stock, the same cost and a value past the limit", () => {
		expect(
			refusal(() => planCostCorrection({ quantity: 0, value: 0 }, 100, "x")),
		).toEqual({ code: "no_stock", field: "newCost" });
		expect(refusal(() => planCostCorrection(balance, 9200, "x"))).toEqual({
			code: "validation",
			field: "newCost",
		});
		expect(
			refusal(() =>
				planCostCorrection({ quantity: 1000, value: 1 }, 2_200_000, "x"),
			),
		).toEqual({ code: "stock_limit", field: "newCost" });
	});
});
