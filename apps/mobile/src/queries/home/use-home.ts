import { useQuery } from "@tanstack/react-query";
import { homeFake } from "./home.fake";

export const homeKeys = { summary: ["home", "summary"] as const };

export function useHomeSummary() {
	return useQuery({ queryKey: homeKeys.summary, queryFn: homeFake.summary });
}
