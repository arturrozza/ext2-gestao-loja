import { useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/queries/auth/use-auth";
import { storeKeys } from "@/queries/store/use-store";

/**
 * Stock, purchases and sales feed each other, alerts, reports and the home, so a change in any of them refetches all
 * business data on screen. The session and the store data don't depend on them and stay put. Doesn't wait for the
 * refetch: the form that saved can leave right away.
 *
 * Paginated lists refetch every loaded page: fine on fake data. On the real API, keep pages small and use a keyset
 * cursor (name + id) instead of an offset.
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
