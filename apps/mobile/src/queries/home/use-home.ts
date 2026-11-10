import { useQuery } from "@tanstack/react-query";
import { api, request } from "@/lib/api";

const homeKeys = { summary: ["home", "summary"] as const };

export function useHomeSummary() {
	return useQuery({
		queryKey: homeKeys.summary,
		queryFn: () => request(api.home.get()),
	});
}
