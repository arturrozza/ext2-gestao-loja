import { t, type UnwrapSchema } from "elysia";
import {
	dayField,
	nonNegativeMoneyTotalField,
	signedMoneyTotalField,
} from "../../lib/fields";

/** The home's month summary (docs/product/inicio.md): this month's active sales, by sale day. */
const summary = t.Object({
	month: t.Object({
		/** The first day of the month these numbers are about. */
		start: dayField,
		revenue: nonNegativeMoneyTotalField,
		profit: signedMoneyTotalField,
		/** Profit ÷ revenue; `null` without revenue. */
		margin: t.Nullable(t.Number()),
		salesCount: t.Integer({ minimum: 0 }),
		/** Profit vs. the same days of last month, as a ratio; `null` with nothing to compare with. */
		profitChange: t.Nullable(t.Number()),
	}),
	/** Revenue of today and the 6 days before, oldest first. */
	week: t.Array(
		t.Object({ date: dayField, revenue: nonNegativeMoneyTotalField }),
		{ minItems: 7, maxItems: 7 },
	),
	/** The number on the Alerts shortcut. */
	alerts: t.Integer({ minimum: 0 }),
});

export const HomeModel = { summary };

export type HomeModel = { summary: UnwrapSchema<typeof HomeModel.summary> };
