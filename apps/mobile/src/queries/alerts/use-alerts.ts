import { useQuery } from "@tanstack/react-query";
import { api, request } from "@/lib/api";

const alertsKeys = { all: ["alerts"] as const };

/** The count of each alert. They come from the data, so any purchase, sale or adjustment refetches them. */
export function useAlerts() {
	return useQuery({
		queryKey: alertsKeys.all,
		queryFn: () => request(api.alerts.get()),
	});
}
