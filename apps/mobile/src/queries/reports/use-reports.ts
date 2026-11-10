import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, request } from "@/lib/api";
import type { ReportPeriod } from "./reports.types";

const reportsKeys = {
	all: ["reports"] as const,
	report: (period: ReportPeriod) => [...reportsKeys.all, period] as const,
};

/** The period as the API asks for it: `from` and `to` only go with a custom one. */
function queryOf(period: ReportPeriod) {
	if (period.kind === "custom") {
		return { period: period.kind, from: period.from, to: period.to };
	}
	return { period: period.kind };
}

/** Keeps the previous report on screen while another period loads. */
export function useReport(period: ReportPeriod) {
	return useQuery({
		queryKey: reportsKeys.report(period),
		queryFn: () => request(api.reports.get({ query: queryOf(period) })),
		placeholderData: keepPreviousData,
	});
}
