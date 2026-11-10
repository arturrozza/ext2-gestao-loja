import { useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/queries/auth/use-auth";
import { storeKeys } from "@/queries/store/use-store";

/**
 * Stock, purchases and sales feed alerts, reports and the home, so any change refetches all business data (not the
 * session or store). Not awaited, so the form can leave right away.
 */
export function useInvalidateBusinessData() {
	const queryClient = useQueryClient();
	return () => {
		queryClient.invalidateQueries({
			predicate: (query) =>
				query.queryKey[0] !== authKeys.all[0] &&
				query.queryKey[0] !== storeKeys.all[0],
		});
	};
}
