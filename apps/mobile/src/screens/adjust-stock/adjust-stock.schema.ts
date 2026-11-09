import { z } from "zod";
import { parseExpiryInput } from "@/lib/dates";
import { ADJUSTMENT_REASONS } from "@/lib/labels";
import { MAX_ADJUST_UNITS } from "@/lib/stock-math";
import {
	type AdjustmentReason,
	INCREASE_REASONS,
	type ProductDetail,
} from "@/queries/products/products.types";

/** Expiry chip value for units without expiry (options need a string). */
export const NO_EXPIRY = "none";

export type AdjustFormValues = {
	newQuantity: string;
	reason: AdjustmentReason | undefined;
	note: string;
	/** Expiry key the units left from (`NO_EXPIRY` for none), when reducing with more than one. */
	fromExpiry: string | undefined;
	/** "mm/aaaa" of the new units, when increasing a product with expiry. */
	expiry: string;
};

/** New quantity, or `null` while the field isn't a whole number. */
export function parseQuantity(text: string): number | null {
	return /^\d+$/.test(text.trim()) ? Number(text.trim()) : null;
}

function toExpiryChoice(key: string | undefined) {
	if (key === undefined) return undefined;
	return key === NO_EXPIRY ? null : key;
}

/**
 * Reasons that fit the change. Going up: count or other. Going down: all of them, with "Vencido descartado" only when
 * there are expired units to discard.
 */
export function allowedReasons(
	product: ProductDetail,
	quantity: number | null,
): AdjustmentReason[] {
	if (quantity !== null && quantity > product.stock)
		return [...INCREASE_REASONS];
	// Going to zero takes every expiry: a discard as expired only fits when all of them are expired.
	const discardable =
		quantity === 0
			? product.expiries.every((balance) => balance.expired)
			: product.expiries.some((balance) => balance.expired);
	return (Object.keys(ADJUSTMENT_REASONS) as AdjustmentReason[]).filter(
		(reason) => reason !== "expired_discarded" || discardable,
	);
}

/**
 * Going down with more than one expiry, the person says where the units left from; going to zero takes them all
 * (estoque.md, "Ajuste").
 */
export function needsFromExpiry(
	product: ProductDetail,
	quantity: number | null,
): boolean {
	return (
		quantity !== null &&
		quantity > 0 &&
		quantity < product.stock &&
		product.expiries.length > 1
	);
}

type Issue = { path: keyof AdjustFormValues; message: string };

function reasonIssue(
	values: AdjustFormValues,
	product: ProductDetail,
	quantity: number,
): Issue | null {
	if (!values.reason) return { path: "reason", message: "Escolha o motivo." };
	if (!allowedReasons(product, quantity).includes(values.reason))
		return {
			path: "reason",
			message: "Esse motivo não vale para essa mudança.",
		};
	if (values.reason === "other" && !values.note.trim())
		return { path: "note", message: "Explique o motivo." };
	return null;
}

/** First rule the values break, given the product being adjusted. */
function firstIssue(
	values: AdjustFormValues,
	product: ProductDetail,
	quantity: number | null,
): Issue | null {
	if (quantity === null)
		return {
			path: "newQuantity",
			message: "Informe a quantidade certa (0 ou mais).",
		};
	if (quantity === product.stock)
		return { path: "newQuantity", message: "É a mesma quantidade de agora." };
	if (quantity - product.stock > MAX_ADJUST_UNITS)
		return {
			path: "newQuantity",
			message: "Um ajuste soma até 100.000 unidades.",
		};
	const issue = reasonIssue(values, product, quantity);
	if (issue) return issue;
	const reducing = quantity < product.stock;
	if (needsFromExpiry(product, quantity) && !values.fromExpiry)
		return { path: "fromExpiry", message: "Escolha de qual validade saiu." };
	if (!reducing && product.hasExpiry && !parseExpiryInput(values.expiry))
		return { path: "expiry", message: "Informe a validade (mês/ano)." };
	return null;
}

/**
 * Stock adjustment (estoque.md, "Ajuste"): the right quantity and a reason. Reducing with more than one expiry asks
 * where the units left from; increasing a product with expiry asks for the expiry of the new units.
 */
export function adjustSchema(product: ProductDetail) {
	return z.custom<AdjustFormValues>().transform((values, ctx) => {
		const quantity = parseQuantity(values.newQuantity);
		const issue = firstIssue(values, product, quantity);
		if (issue || quantity === null || !values.reason) {
			ctx.addIssue({
				code: "custom",
				path: [issue?.path ?? "newQuantity"],
				message: issue?.message ?? "Informe a quantidade certa.",
			});
			return z.NEVER;
		}
		const reducing = quantity < product.stock;
		return {
			newQuantity: quantity,
			reason: values.reason,
			note: values.note.trim() || null,
			fromExpiry: reducing ? toExpiryChoice(values.fromExpiry) : undefined,
			expiry: reducing ? null : parseExpiryInput(values.expiry),
		};
	});
}
