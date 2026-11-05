import type { ISODate } from "@/lib/dates";
import type { Money } from "@/lib/money";
import type { SaleChannel } from "@/queries/sales/sales.types";

export type ReportPeriod =
	| { kind: "today" | "7d" | "month" | "last_month" }
	| { kind: "custom"; from: ISODate; to: ISODate };

export type ReportBucket = {
	/** First day of the bucket. */
	date: ISODate;
	/** Short label under the bar ("04/11"). */
	label: string;
	revenue: Money;
	profit: Money;
};

export type ReportProduct = {
	productId: string;
	name: string;
	quantity: number;
	revenue: Money;
	/** Profit ÷ revenue, `null` when the revenue is zero. */
	margin: number | null;
};

export type Report = {
	from: ISODate;
	to: ISODate;
	summary: {
		revenue: Money;
		profit: Money;
		margin: number | null;
		count: number;
		averageTicket: Money;
	};
	/** A bar per day, week or month, depending on how long the period is. */
	evolution: ReportBucket[];
	evolutionUnit: "day" | "week" | "month";
	costs: {
		products: Money;
		freight: Money;
		tax: Money;
		fees: Money;
		commissions: Money;
		other: Money;
	};
	channels: { channel: SaleChannel; revenue: Money; profit: Money }[];
	products: {
		bestSellers: ReportProduct[];
		worstSellers: ReportProduct[];
		bestMargin: ReportProduct[];
		worstMargin: ReportProduct[];
	};
	categories: { name: string; revenue: Money; profit: Money }[];
	resellers: { id: string; name: string; revenue: Money; commission: Money }[];
};
