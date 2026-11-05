import type { ISODate } from "@/lib/dates";
import type { Money } from "@/lib/money";

/** What the home screen shows: the month's summary and the counts on the shortcuts (docs/product/README.md). */
export type HomeSummary = {
	month: {
		/** "novembro": the month these numbers are about. */
		name: string;
		/** "outubro": the month `profitChange` compares with. */
		previousName: string;
		profit: Money;
		revenue: Money;
		/** `null` while there are no sales. */
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
	counts: {
		products: number;
		purchases: number;
		activeResellers: number;
		activeCustomers: number;
		alerts: number;
	};
};
