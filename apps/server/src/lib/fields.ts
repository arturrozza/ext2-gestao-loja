import { Type } from "@sinclair/typebox";
import { t } from "elysia";
import { FULL_PERCENT, MAX_CENTS } from "./money";

/** Optional free text: `null`, or a string up to `maxLength` (a blank one is saved as `null` by the rules). */
export const optionalText = (maxLength: number) =>
	t.Union([t.Null(), t.String({ maxLength })]);

/*
 * Money and percentages use TypeBox's own `Integer`, not Elysia's `t.Integer`: Elysia's also takes a numeric string
 * and converts it ("10" → 10), so an old app sending "10" for 10% would save 10 basis points (0,1%). Only a JSON number
 * that is already whole passes; nothing is ever rounded or converted on the way in (docs/stack.md).
 */

/** Money in integer cents (R$ 92,50 = 9250), from zero to what an `integer` column holds. */
export const moneyField = Type.Integer({ minimum: 0, maximum: MAX_CENTS });

/** Percentage in basis points, 0 to 10000 (12,5% = 1250). */
export const percentField = Type.Integer({ minimum: 0, maximum: FULL_PERCENT });

/**
 * A sum of cents that can't go below zero (sales and commission totals), with no `integer` column limit. Not for
 * totals that can be negative (profit): those need their own field without the minimum.
 */
export const nonNegativeMoneyTotalField = Type.Integer({ minimum: 0 });

/**
 * A total of cents that can be negative (a profit, which a loss takes below zero), with no `integer` column limit.
 */
export const signedMoneyTotalField = Type.Integer();

/**
 * The id of a row sent in a body, in lower case only: the database gives ids back in lower case, so an id the app
 * sends matches the rows read back (the `uuid` format alone takes upper case too).
 */
export const idField = t.String({ format: "uuid", pattern: "^[0-9a-f-]+$" });

/** Most units one line of a purchase (or sale) takes. */
export const MAX_LINE_UNITS = 100_000;

/** Units in one line: a whole number above zero (TypeBox's `Integer`, so "10" is refused, not converted). */
export const unitsField = Type.Integer({ minimum: 1, maximum: MAX_LINE_UNITS });

/**
 * A calendar day, "YYYY-MM-DD". Only the shape: Elysia's `date` format lets "2026-02-30" through, so whether the day
 * exists is checked by the rules (`isRealDay`).
 */
export const dayField = t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" });

/** Expiry month, "YYYY-MM" (docs/product/compras.md). The year starts at 1000: Postgres has no year 0. */
export const expiryMonthField = t.String({
	pattern: "^[1-9]\\d{3}-(0[1-9]|1[0-2])$",
});
