import { type ISODate, storeToday } from "../../lib/dates";
import type { ReportsModel } from "./reports.model";
import { evolutionUnitOf, resolvePeriod } from "./reports.period";
import { readReportData } from "./reports.queries";
import { buildReport } from "./reports.rules";

export const ReportsService = {
	/** The report of the period asked for (the current month when none): invalid custom days are a 422. */
	async report(
		storeId: string,
		query: ReportsModel["query"],
		today: ISODate = storeToday(),
	): Promise<ReportsModel["report"]> {
		const range = resolvePeriod(query, today);
		const data = await readReportData(storeId, range);
		return buildReport(data, range, evolutionUnitOf(range));
	},
};
