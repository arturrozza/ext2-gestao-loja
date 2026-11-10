import { useQuery } from "@tanstack/react-query";
import { api, request } from "@/lib/api";

export const homeKeys = { summary: ["home", "summary"] as const };

/** The home's month summary, week bars and number of alerts. */
export function useHomeSummary() {
	return useQuery({
		queryKey: homeKeys.summary,
		queryFn: () => request(api.home.get()),
	});
}
