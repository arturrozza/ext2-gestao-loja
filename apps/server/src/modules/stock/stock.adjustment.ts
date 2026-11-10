import type { ExpiryMonth } from "../../lib/dates";
import { MAX_LINE_UNITS } from "../../lib/fields";
import { httpError } from "../../lib/http-error";
import { divideRounded } from "../../lib/money";
import { blankToNull } from "../../lib/text";
import { stockLimit } from "./stock.errors";
import {
	type AdjustmentPlan,
	type AdjustmentReason,
	averageCost,
	type CostCorrectionPlan,
	exitValue,
	fitsStock,
	type MovementPlan,
	type OpenLot,
	type StockBalance,
} from "./stock.rules";

/*
 * Stock corrections (docs/product/estoque.md, "Ajuste" and "Correção de custo"): pure rules, so the service only reads,
 * plans and records. Every refusal is a 422 on the field to fix.
 */

/** Reasons that can add units: losses, damage, discards and gifts only take units away. */
export const INCREASE_REASONS: readonly AdjustmentReason[] = ["count", "other"];

export type AdjustmentInput = {
	newQuantity: number;
	reason: AdjustmentReason;
	note: string | null;
	/** Going down with more than one expiry: where the units left from (`null`: those without expiry). */
	fromExpiry?: ExpiryMonth | null;
	/** Going up on a product with expiry: the expiry of the new units (a past month is fine: found expired). */
	expiry?: ExpiryMonth | null;
};

const invalid = (field: string, message: string, code = "validation") =>
	httpError(422, { code, message, field });

const unitsLabel = (units: number) =>
	units === 1 ? "1 unidade" : `${units} unidades`;

/** The movement that changes `balance` by `units` and `valueChange`, refused past what the ledger holds. */
function movementOf(
	balance: StockBalance,
	change: { quantity: number; unitCost: number; valueChange: number },
	field: string,
): MovementPlan {
	const after = {
		quantity: balance.quantity + change.quantity,
		value: balance.value + change.valueChange,
	};
	if (!fitsStock(after)) throw stockLimit(field);
	return {
		...change,
		stockAfter: after.quantity,
		averageCostAfter: averageCost(after),
	};
}

/**
 * Units found on the shelf come in as a new lot. Only a count or "other" adds units, and only with stock: the units
 * take its average cost, and without stock there's none to give them (that's a purchase).
 */
function newLotOf(
	balance: StockBalance,
	units: number,
	hasExpiry: boolean,
	input: AdjustmentInput,
): NonNullable<AdjustmentPlan["newLot"]> {
	if (!INCREASE_REASONS.includes(input.reason)) {
		throw invalid("reason", "Esse motivo só vale para tirar unidades.");
	}
	if (balance.quantity === 0) {
		throw invalid(
			"newQuantity",
			"Sem estoque não há custo para as novas unidades. Lance uma compra.",
			"no_stock_cost",
		);
	}
	if (units > MAX_LINE_UNITS) {
		throw invalid("newQuantity", "Um ajuste soma até 100.000 unidades.");
	}
	const expiry = input.expiry ?? null;
	if (hasExpiry !== (expiry !== null)) {
		throw invalid(
			"expiry",
			hasExpiry ? "Informe a validade." : "Esse produto não tem validade.",
		);
	}
	return { expiry, quantity: units };
}

/**
 * The lots the units can leave from: all of them when the stock goes to zero or there's only one expiry; otherwise
 * those of the expiry the person chose, which must have the units.
 */
function sourceLots(
	lots: OpenLot[],
	input: AdjustmentInput,
	units: number,
): OpenLot[] {
	const expiries = new Set(lots.map((lot) => lot.expiry));
	if (input.newQuantity === 0 || expiries.size <= 1) return lots;
	if (input.fromExpiry === undefined) {
		throw invalid("fromExpiry", "Escolha de qual validade saiu.");
	}
	const chosen = lots.filter((lot) => lot.expiry === input.fromExpiry);
	const available = chosen.reduce((sum, lot) => sum + lot.quantity, 0);
	if (available === 0) {
		throw invalid("fromExpiry", "Não há unidades com essa validade.");
	}
	if (units > available) {
		throw invalid(
			"fromExpiry",
			`Essa validade só tem ${unitsLabel(available)}.`,
		);
	}
	return chosen;
}

/** Units missing from the shelf leave their lots, oldest first. A discard as expired takes only expired units. */
function takesOf(
	lots: OpenLot[],
	units: number,
	input: AdjustmentInput,
): AdjustmentPlan["takes"] {
	const source = sourceLots(lots, input, units);
	if (
		input.reason === "expired_discarded" &&
		source.some((lot) => !lot.expired)
	) {
		throw invalid(
			"reason",
			"Só unidades vencidas saem como vencido descartado.",
		);
	}
	const takes: AdjustmentPlan["takes"] = [];
	let left = units;
	for (const lot of source) {
		const taken = Math.min(lot.quantity, left);
		if (taken > 0) takes.push({ lotId: lot.id, units: taken });
		left -= taken;
	}
	// The lots add up to the stock (the ledger keeps them together): anything left means they drifted apart.
	if (left > 0) throw new Error("stock lots hold fewer units than the stock");
	return takes;
}

/**
 * An adjustment to the quantity on the shelf, with its reason. Units come in or leave at the average cost: in, it
 * stays; out, the whole value leaves with the last unit. The stock never goes below zero: the new quantity is never
 * negative, and a decrease takes only what the lots have.
 */
export function planAdjustment(
	balance: StockBalance,
	lots: OpenLot[],
	hasExpiry: boolean,
	input: AdjustmentInput,
): AdjustmentPlan {
	const units = input.newQuantity - balance.quantity;
	if (units === 0) {
		throw invalid("newQuantity", "É a mesma quantidade de agora.");
	}
	const note = blankToNull(input.note);
	if (input.reason === "other" && !note) {
		throw invalid("note", "Explique o motivo.");
	}
	const newLot = units > 0 ? newLotOf(balance, units, hasExpiry, input) : null;
	const takes = units < 0 ? takesOf(lots, -units, input) : [];
	const valueChange =
		units > 0
			? divideRounded(balance.value * units, balance.quantity)
			: -exitValue(balance, -units, averageCost(balance));
	const movement = movementOf(
		balance,
		{ quantity: units, unitCost: averageCost(balance), valueChange },
		"newQuantity",
	);
	return { movement, reason: input.reason, note, takes, newLot };
}

/** The right average cost for every unit in stock, from now on (earlier sales keep theirs), and why. */
export function planCostCorrection(
	balance: StockBalance,
	newCost: number,
	note: string,
): CostCorrectionPlan {
	if (balance.quantity === 0) {
		throw invalid(
			"newCost",
			"Sem estoque não há custo para corrigir.",
			"no_stock",
		);
	}
	// Against the rounded cost the person sees: 333 on 3 units worth 1000 is "the same", though it'd be 999.
	if (newCost === averageCost(balance)) {
		throw invalid("newCost", "É o mesmo custo de agora.");
	}
	const valueChange = newCost * balance.quantity - balance.value;
	return {
		movement: movementOf(
			balance,
			{ quantity: 0, unitCost: newCost, valueChange },
			"newCost",
		),
		note: note.trim(),
	};
}
