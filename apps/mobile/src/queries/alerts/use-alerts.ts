import { useInfiniteQuery } from "@tanstack/react-query";
import { pagedQuery } from "@/queries/pagination";
import { underConstruction } from "@/queries/under-construction";
import type { AlertListFilters, AlertPage } from "./alerts.types";

export const alertsKeys = {
	all: ["alerts"] as const,
	list: (filters: AlertListFilters) =>
		[...alertsKeys.all, "list", filters] as const,
};

/** Active alerts, most urgent first, paginated. */
export function useAlerts(filters: AlertListFilters) {
	return useInfiniteQuery({
		queryKey: alertsKeys.list(filters),
		...pagedQuery((cursor) => underConstruction<AlertPage>(filters, cursor)),
	});
}
