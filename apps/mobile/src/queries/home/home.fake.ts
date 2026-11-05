/** FAKE BACKEND (MUN-21): home summary. */
import { addDays, fromISODate, monthName, todayISODate } from "@/lib/dates";
import { fromCents } from "@/lib/money";
import { allAlerts } from "@/queries/alerts/alerts.fake";
import { db } from "@/queries/fake/fake-db";
import { fakeRequest } from "@/queries/fake/fake-server";
import { salesInRange, saleTotals } from "@/queries/fake/product-results";
import { periodRange } from "@/queries/reports/reports.fake";
import type { HomeSummary } from "./home.types";

const totals = (from: string, to: string) => saleTotals(salesInRange(from, to));

/** The same day of the previous month, or its last day when that month is shorter. */
function sameDayLastMonth(today: string, lastMonthEnd: string) {
	const sameDay = `${lastMonthEnd.slice(0, 7)}-${today.slice(8)}`;
	return sameDay < lastMonthEnd ? sameDay : lastMonthEnd;
}

function summary(): HomeSummary {
	const today = todayISODate();
	const month = periodRange({ kind: "month" }, today);
	const last = periodRange({ kind: "last_month" }, today);
	const current = totals(month.from, month.to);
	const previous = totals(last.from, sameDayLastMonth(today, last.to));
	return {
		month: {
			name: monthName(fromISODate(month.from).getMonth()),
			previousName: monthName(fromISODate(last.from).getMonth()),
			profit: fromCents(current.profitCents),
			revenue: fromCents(current.revenueCents),
			margin: current.margin,
			salesCount: current.count,
			profitChange:
				previous.profitCents > 0
					? (current.profitCents - previous.profitCents) / previous.profitCents
					: null,
		},
		week: [6, 5, 4, 3, 2, 1, 0].map((back) => {
			const date = addDays(today, -back);
			return { date, revenue: fromCents(totals(date, date).revenueCents) };
		}),
		counts: {
			products: db.current.products.filter((p) => !p.archived).length,
			purchases: db.current.purchases.filter((p) => !p.canceledAt).length,
			activeResellers: db.current.resellers.filter((r) => !r.archived).length,
			activeCustomers: db.current.customers.filter((c) => !c.archived).length,
			alerts: allAlerts().length,
		},
	};
}

export const homeFake = {
	summary: () => fakeRequest(summary),
};
