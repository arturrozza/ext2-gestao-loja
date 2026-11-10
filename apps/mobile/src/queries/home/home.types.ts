import type { ISODate } from "@/lib/dates";
import type { Money } from "@/lib/money";

/** What the home screen shows: the month summary and the number on the Alerts shortcut (docs/product/inicio.md). */
export type HomeSummary = {
	month: {
		/** First day of the month these numbers are about. */
		start: ISODate;
		profit: Money;
		revenue: Money;
		/** `null` while there's no revenue. */
		margin: number | null;
		salesCount: number;
		/**
		 * Profit vs. the same days of last month (the 1st to today's day) as a ratio; `null` when there's nothing to
		 * compare with.
		 */
		profitChange: number | null;
	};
	/** Last 7 days, oldest first; the last one is today. */
	week: { date: ISODate; revenue: Money }[];
	alerts: number;
};
