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
