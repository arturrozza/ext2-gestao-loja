import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { api, request } from "@/lib/api";
import { useInvalidateBusinessData } from "@/queries/invalidate";
import { pagedQuery } from "@/queries/pagination";
import type { PurchaseInput, PurchaseListFilters } from "./purchases.types";

export const purchasesKeys = {
	all: ["purchases"] as const,
	list: (filters: PurchaseListFilters) =>
		[...purchasesKeys.all, "list", filters] as const,
	detail: (id: string) => [...purchasesKeys.all, "detail", id] as const,
};

/** Purchase history, newest first, paginated. */
export function usePurchases(filters: PurchaseListFilters) {
	return useInfiniteQuery({
		queryKey: purchasesKeys.list(filters),
		...pagedQuery((cursor) =>
			request(
				api.purchases.get({
					query: { status: filters.status ?? undefined, cursor },
				}),
			),
		),
	});
}

export function usePurchase(id: string) {
	return useQuery({
		queryKey: purchasesKeys.detail(id),
		queryFn: () => request(api.purchases({ id }).get()),
	});
}

/** Purchases change stock and cost, which feed products, alerts, reports and the home: refetch everything. */
export function useCreatePurchase() {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (input: PurchaseInput) => request(api.purchases.post(input)),
		onSuccess: invalidate,
	});
}

/**
 * Canceling takes the units and their cost back out of the stock: refetch everything, like entering one. Also after a
 * refusal (already canceled, units already gone): the screen shows the purchase as it is now. A blank reason is none.
 */
export function useCancelPurchase(id: string) {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (reason: string) =>
			request(api.purchases({ id }).cancel.post({ reason })),
		onSettled: invalidate,
	});
}
