import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { underConstruction } from "@/queries/under-construction";
import type { Report, ReportPeriod } from "./reports.types";

export const reportsKeys = {
	all: ["reports"] as const,
	report: (period: ReportPeriod) => [...reportsKeys.all, period] as const,
};

/** Keeps the previous report on screen while another period loads. */
export function useReport(period: ReportPeriod) {
	return useQuery({
		queryKey: reportsKeys.report(period),
		queryFn: () => underConstruction<Report>(period),
		placeholderData: keepPreviousData,
	});
}
