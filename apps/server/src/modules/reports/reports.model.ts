import { t, type UnwrapSchema } from "elysia";
import {
	dayField,
	nonNegativeMoneyTotalField,
	signedMoneyTotalField,
} from "../../lib/fields";
import { channel } from "../sales/sales.model";

/** The periods of the report (relatorios.md); `custom` takes `from` and `to`. */
const PERIODS = ["today", "7d", "month", "last_month", "custom"] as const;

const query = t.Object({
	/** Left out, the current month. */
	period: t.Optional(t.UnionEnum(PERIODS)),
	/** Both days of a custom period, inclusive; the day the user gave each sale. Ignored on any other period. */
	from: t.Optional(dayField),
	to: t.Optional(dayField),
});

/** Cents, never negative. */
const money = nonNegativeMoneyTotalField;
const profit = signedMoneyTotalField;

/** Profit ÷ revenue; `null` without revenue. */
const margin = t.Nullable(t.Number());

const bucket = t.Object({
	/** First day of the bar: the day itself, the first of 7 days from the period's start, or the first of the month. */
	date: dayField,
	revenue: money,
	profit,
});

const product = t.Object({
	productId: t.String({ format: "uuid" }),
	name: t.String(),
	quantity: t.Integer({ minimum: 1 }),
	revenue: money,
	margin,
});

const report = t.Object({
	from: dayField,
	to: dayField,
	summary: t.Object({
		revenue: money,
		profit,
		margin,
		count: t.Integer({ minimum: 0 }),
		/** Revenue ÷ sales, rounded to the cent; zero without sales. */
		averageTicket: money,
	}),
	/** A bar per day (up to 31 days), per 7 days (up to about 6 months) or per month. */
	evolutionUnit: t.UnionEnum(["day", "week", "month"]),
	evolution: t.Array(bucket),
	/** Products + freight + tax + fees + commissions + other + profit = the revenue. */
	costs: t.Object({
		products: money,
		freight: money,
		tax: money,
		fees: money,
		commissions: money,
		other: money,
	}),
	/** The three channels, always, even with nothing sold. */
	channels: t.Array(t.Object({ channel, revenue: money, profit })),
	products: t.Object({
		bestSellers: t.Array(product),
		worstSellers: t.Array(product),
		bestMargin: t.Array(product),
		worstMargin: t.Array(product),
	}),
	/** Biggest revenue first; products without a category are one "Sem categoria" line (`id` null). */
	categories: t.Array(
		t.Object({
			id: t.Nullable(t.String({ format: "uuid" })),
			name: t.String(),
			revenue: money,
			profit,
		}),
	),
	resellers: t.Array(
		t.Object({
			id: t.String({ format: "uuid" }),
			name: t.String(),
			revenue: money,
			commission: money,
		}),
	),
});

export const ReportsModel = { query, report };

export type ReportsModel = {
	query: UnwrapSchema<typeof ReportsModel.query>;
	report: UnwrapSchema<typeof ReportsModel.report>;
};
