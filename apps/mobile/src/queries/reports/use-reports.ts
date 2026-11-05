import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportsFake } from "./reports.fake";
import type { ReportPeriod } from "./reports.types";

export const reportsKeys = {
	all: ["reports"] as const,
	report: (period: ReportPeriod) => [...reportsKeys.all, period] as const,
};

/** Keeps the previous report on screen while another period loads. */
export function useReport(period: ReportPeriod) {
	return useQuery({
		queryKey: reportsKeys.report(period),
		queryFn: () => reportsFake.report(period),
		placeholderData: keepPreviousData,
	});
}
