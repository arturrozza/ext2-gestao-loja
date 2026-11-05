import { useQuery } from "@tanstack/react-query";
import { underConstruction } from "@/queries/under-construction";
import type { HomeSummary } from "./home.types";

export const homeKeys = { summary: ["home", "summary"] as const };

/** Month summary of the home (MUN-18): under construction. */
export function useHomeSummary() {
	return useQuery({
		queryKey: homeKeys.summary,
		queryFn: () => underConstruction<HomeSummary>(),
	});
}
