/**
 * FAKE BACKEND (MUN-21): stock rules from docs/product/estoque.md and compras.md, shared by the purchases, sales and
 * products fakes. Every change of quantity or cost appends a movement; nothing is ever rewritten.
 */

import { ApiError } from "@/lib/api-error";
import { type ExpiryMonth, isExpired } from "@/lib/dates";
import {
	type AdjustmentReason,
	INCREASE_REASONS,
} from "@/queries/products/products.types";
import {
	db,
	type LotRow,
	type MovementRow,
	nextId,
	nowISO,
	type ProductRow,
} from "./fake-db";

export function lotsOf(productId: string): LotRow[] {
	return db.current.lots.filter(
		(lot) => lot.productId === productId && lot.quantity > 0,
	);
}

export function stockOf(productId: string): number {
	return lotsOf(productId).reduce((sum, lot) => sum + lot.quantity, 0);
}

/** Lots that can leave in a sale: not expired, nearest expiry first, then oldest (estoque.md, "Saída na venda"). */
export function sellableLots(productId: string): LotRow[] {
	return lotsOf(productId)
		.filter((lot) => !(lot.expiry && isExpired(lot.expiry)))
		.sort(
			(a, b) =>
				(a.expiry ?? "9999-12").localeCompare(b.expiry ?? "9999-12") ||
				a.createdAt.localeCompare(b.createdAt),
		);
}

export function sellableStock(productId: string): number {
	return sellableLots(productId).reduce((sum, lot) => sum + lot.quantity, 0);
}

type MovementInput = Pick<MovementRow, "type" | "quantity" | "unitCostCents"> &
	Partial<
		Pick<MovementRow, "reason" | "note" | "purchaseId" | "saleId" | "createdAt">
	>;

function record(product: ProductRow, input: MovementInput) {
	db.current.movements.push({
		id: nextId("mov"),
		productId: product.id,
		reason: null,
		note: null,
		purchaseId: null,
		saleId: null,
		...input,
		createdAt: input.createdAt ?? nowISO(),
		averageCostAfterCents: product.averageCostCents,
		stockAfter: stockOf(product.id),
		author: db.current.user.name,
	});
}

/** New average cost after `quantity` units at `unitCostCents` come in (compras.md, "Custo médio"). */
function averageAfterEntry(
	product: ProductRow,
	quantity: number,
	unitCostCents: number,
) {
	const current = stockOf(product.id);
	if (current === 0) return unitCostCents;
	return Math.round(
		(current * product.averageCostCents + quantity * unitCostCents) /
			(current + quantity),
	);
}

type Entry = {
	product: ProductRow;
	quantity: number;
	unitCostCents: number;
	expiry: ExpiryMonth | null;
	purchaseId: string | null;
	createdAt?: string;
};

/** Purchase item rules (compras.md): whole quantity above zero, cost not negative, expiry when the product has one. */
function assertEntry(entry: Entry) {
	if (!Number.isInteger(entry.quantity) || entry.quantity <= 0) {
		throw new ApiError(
			"invalid_quantity",
			"A quantidade precisa ser maior que zero.",
		);
	}
	if (!Number.isInteger(entry.unitCostCents) || entry.unitCostCents < 0) {
		throw new ApiError("invalid_cost", "O custo não pode ser negativo.");
	}
	if (entry.product.hasExpiry && !entry.expiry) {
		throw new ApiError(
			"expiry_required",
			`Informe a validade de ${entry.product.name}.`,
		);
	}
}

/** Purchase item → new lot, new average cost, "purchase" movement. */
export function receive(entry: Entry): LotRow {
	assertEntry(entry);
	const { product, quantity, unitCostCents } = entry;
	product.averageCostCents = averageAfterEntry(
		product,
		quantity,
		unitCostCents,
	);
	const lot: LotRow = {
		id: nextId("lot"),
		productId: product.id,
		purchaseId: entry.purchaseId,
		expiry: product.hasExpiry ? entry.expiry : null,
		initialQuantity: quantity,
		quantity,
		createdAt: entry.createdAt ?? nowISO(),
	};
	db.current.lots.push(lot);
	record(product, {
		type: "purchase",
		quantity,
		unitCostCents,
		purchaseId: entry.purchaseId,
		createdAt: entry.createdAt,
	});
	return lot;
}

function replayMovement(
	state: { quantity: number; average: number },
	movement: MovementRow,
) {
	const quantity = state.quantity + movement.quantity;
	if (movement.type === "cost_correction") {
		return { quantity, average: movement.unitCostCents };
	}
	if (movement.type !== "purchase") return { ...state, quantity };
	if (state.quantity <= 0) return { quantity, average: movement.unitCostCents };
	const total =
		state.quantity * state.average + movement.quantity * movement.unitCostCents;
	return { quantity, average: Math.round(total / quantity) };
}

/**
 * Average cost replayed from the ledger, skipping canceled purchases and `excludingPurchaseId`: the value as if they
 * never existed (compras.md). Sales and adjustments only change the quantity; cost corrections set the cost.
 */
function replayedAverage(
	productId: string,
	excludingPurchaseId: string | null,
) {
	const skipped = new Set(
		db.current.purchases.filter((p) => p.canceledAt).map((p) => p.id),
	);
	if (excludingPurchaseId) skipped.add(excludingPurchaseId);
	let state = { quantity: 0, average: 0 };
	for (const movement of db.current.movements) {
		const counts =
			movement.productId === productId &&
			!(movement.purchaseId && skipped.has(movement.purchaseId));
		if (counts) state = replayMovement(state, movement);
	}
	return state.average;
}

/** True when no unit of the lot has left it yet (sold or adjusted out). */
export function lotUntouched(lot: LotRow): boolean {
	return lot.quantity === lot.initialQuantity;
}

/**
 * Undoes a purchase lot as if it never existed (compras.md, "Ao cancelar"). Refuses once any unit has left the lot:
 * then the fix is an adjustment or a cost correction.
 */
export function reverseEntry(
	product: ProductRow,
	lot: LotRow,
	unitCostCents: number,
) {
	if (!lotUntouched(lot)) {
		throw new ApiError(
			"purchase_used",
			`Unidades de ${product.name} desta compra já saíram do estoque (venda ou ajuste). Corrija pelo ajuste ou por "Corrigir custo".`,
		);
	}
	const quantity = lot.quantity;
	lot.quantity = 0;
	product.averageCostCents = replayedAverage(product.id, lot.purchaseId);
	record(product, {
		type: "purchase_canceled",
		quantity: -quantity,
		unitCostCents,
		purchaseId: lot.purchaseId,
	});
}

/** Takes units for a sale from the sellable lots, nearest expiry first. Throws when there isn't enough. */
export function take(
	product: ProductRow,
	quantity: number,
	saleId: string,
	createdAt?: string,
) {
	const available = sellableStock(product.id);
	if (available < quantity) {
		throw new ApiError(
			"insufficient_stock",
			`Estoque insuficiente de ${product.name}: disponível ${available}.`,
			{ productId: product.id, available },
		);
	}
	const takenFrom: { lotId: string; quantity: number }[] = [];
	let missing = quantity;
	for (const lot of sellableLots(product.id)) {
		if (missing === 0) break;
		const used = Math.min(lot.quantity, missing);
		lot.quantity -= used;
		missing -= used;
		takenFrom.push({ lotId: lot.id, quantity: used });
	}
	record(product, {
		type: "sale",
		quantity: -quantity,
		unitCostCents: product.averageCostCents,
		saleId,
		createdAt,
	});
	return takenFrom;
}

/** Puts sold units back in the lots they came from. The average cost doesn't change (compras.md). */
export function giveBack(
	product: ProductRow,
	takenFrom: { lotId: string; quantity: number }[],
	unitCostCents: number,
	saleId: string,
) {
	let quantity = 0;
	for (const part of takenFrom) {
		const lot = db.current.lots.find((row) => row.id === part.lotId);
		if (!lot)
			throw new ApiError("lot_missing", "Lote da venda não encontrado.");
		lot.quantity += part.quantity;
		quantity += part.quantity;
	}
	record(product, { type: "sale_canceled", quantity, unitCostCents, saleId });
}

export type Adjustment = {
	product: ProductRow;
	newQuantity: number;
	reason: AdjustmentReason;
	note: string | null;
	/**
	 * Reducing with more than one expiry: the expiry the units left from (`null` = the units without expiry).
	 * `undefined` = not chosen.
	 */
	fromExpiry: ExpiryMonth | null | undefined;
	/** Increasing a product with expiry: the expiry of the new units. */
	expiry: ExpiryMonth | null;
};

/** Distinct expiries a product has in stock (`null` = units without expiry). */
export function expiriesOf(productId: string): (ExpiryMonth | null)[] {
	return [...new Set(lotsOf(productId).map((lot) => lot.expiry))];
}

function reduce(adjustment: Adjustment, units: number) {
	const expiries = expiriesOf(adjustment.product.id);
	const expiry = expiries.length === 1 ? expiries[0] : adjustment.fromExpiry;
	if (expiry === undefined || !expiries.includes(expiry)) {
		throw new ApiError(
			"expiry_choice_required",
			"Escolha de qual validade saiu.",
		);
	}
	if (
		adjustment.reason === "expired_discarded" &&
		!(expiry && isExpired(expiry))
	) {
		throw new ApiError(
			"not_expired",
			"Vencido descartado só vale para unidades com a validade vencida.",
		);
	}
	const lots = lotsOf(adjustment.product.id)
		.filter((lot) => lot.expiry === expiry)
		.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
	const available = lots.reduce((sum, lot) => sum + lot.quantity, 0);
	if (available < units) {
		throw new ApiError(
			"insufficient_expiry",
			`Essa validade só tem ${available} unidades.`,
		);
	}
	let missing = units;
	for (const lot of lots) {
		const used = Math.min(lot.quantity, missing);
		lot.quantity -= used;
		missing -= used;
	}
}

function increase(adjustment: Adjustment, units: number) {
	if (!INCREASE_REASONS.includes(adjustment.reason)) {
		throw new ApiError(
			"invalid_reason",
			"Esse motivo só vale para reduzir o estoque.",
		);
	}
	if (adjustment.product.hasExpiry && !adjustment.expiry) {
		throw new ApiError("expiry_required", "Informe a validade.");
	}
	// New units come in at the current average cost, which stays the same (estoque.md, "Ajuste").
	db.current.lots.push({
		id: nextId("lot"),
		productId: adjustment.product.id,
		purchaseId: null,
		expiry: adjustment.product.hasExpiry ? adjustment.expiry : null,
		initialQuantity: units,
		quantity: units,
		createdAt: nowISO(),
	});
}

export function adjust(adjustment: Adjustment) {
	const { product, newQuantity } = adjustment;
	if (!Number.isInteger(newQuantity) || newQuantity < 0) {
		throw new ApiError(
			"invalid_quantity",
			"O estoque não pode ficar negativo.",
		);
	}
	const delta = newQuantity - stockOf(product.id);
	if (delta === 0) {
		throw new ApiError("no_change", "A quantidade é a mesma de agora.");
	}
	if (delta < 0) reduce(adjustment, -delta);
	else increase(adjustment, delta);
	record(product, {
		type: "adjustment",
		quantity: delta,
		unitCostCents: product.averageCostCents,
		reason: adjustment.reason,
		note: adjustment.note,
	});
}

export function correctCost(
	product: ProductRow,
	newCostCents: number,
	note: string,
) {
	if (stockOf(product.id) === 0) {
		throw new ApiError(
			"no_stock",
			"Sem estoque não há custo para corrigir: a próxima compra define o custo.",
		);
	}
	if (!Number.isInteger(newCostCents) || newCostCents < 0) {
		throw new ApiError("invalid_cost", "O custo não pode ser negativo.");
	}
	if (!note.trim()) {
		throw new ApiError("note_required", "Informe o motivo da correção.");
	}
	if (newCostCents === product.averageCostCents) {
		throw new ApiError("no_change", "O custo é o mesmo de agora.");
	}
	product.averageCostCents = newCostCents;
	record(product, {
		type: "cost_correction",
		quantity: 0,
		unitCostCents: newCostCents,
		note,
	});
}
