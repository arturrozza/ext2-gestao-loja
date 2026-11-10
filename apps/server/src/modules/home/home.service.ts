import { type ISODate, storeToday } from "../../lib/dates";
import { alertsTotal } from "../alerts/alerts.rules";
import { AlertsService } from "../alerts/alerts.service";
import { dailyTotals } from "../sales/sales.queries";
import type { HomeModel } from "./home.model";
import { previousMonthSoFar, summarize } from "./home.rules";

/** What the home shows: the month summary, the week's bars and the number of alerts. */
export const HomeService = {
	async summary(
		storeId: string,
		today: ISODate = storeToday(),
	): Promise<HomeModel["summary"]> {
		const [days, alerts] = await Promise.all([
			dailyTotals(storeId, previousMonthSoFar(today).start, today),
			AlertsService.counts(storeId, today),
		]);
		return { ...summarize(days, today), alerts: alertsTotal(alerts) };
	},
};
