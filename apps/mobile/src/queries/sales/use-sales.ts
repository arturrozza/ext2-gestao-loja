import {
	keepPreviousData,
	useInfiniteQuery,
	useMutation,
	useQuery,
} from "@tanstack/react-query";
import { api, request } from "@/lib/api";
import { isApiError } from "@/lib/api-error";
import { useInvalidateBusinessData } from "@/queries/invalidate";
import { pagedQuery } from "@/queries/pagination";
import type { SaleInput, SaleListFilters } from "./sales.types";

const salesKeys = {
	all: ["sales"] as const,
	list: (filters: SaleListFilters) =>
		[...salesKeys.all, "list", filters] as const,
	detail: (id: string) => [...salesKeys.all, "detail", id] as const,
};

/** Sales list, newest first, paginated, with the totals of the filter on each page. */
export function useSales(filters: SaleListFilters) {
	return useInfiniteQuery({
		queryKey: salesKeys.list(filters),
		...pagedQuery((cursor) =>
			request(
				api.sales.get({
					query: {
						period: filters.period,
						channels: filters.channels,
						result: filters.result ?? undefined,
						customerId: filters.customerId,
						resellerId: filters.resellerId,
						cursor,
					},
				}),
			),
		),
		placeholderData: keepPreviousData,
	});
}

export function useSale(id: string) {
	return useQuery({
		queryKey: salesKeys.detail(id),
		queryFn: () => request(api.sales({ id }).get()),
	});
}

/** A sale changes stock, reports, alerts, commissions and the home: refetch everything. */
export function useCreateSale() {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (input: SaleInput) => request(api.sales.post(input)),
		onSuccess: invalidate,
		// Someone else sold the last units: refresh, so the lines show the stock block with its shortcuts.
		onError: (error) => {
			if (isApiError(error, "insufficient_stock")) invalidate();
		},
	});
}

/**
 * Canceling gives the units back and takes the sale out of every total: refetch everything, like entering one. Also
 * after a refusal (already canceled): the screen shows the sale as it is now.
 */
export function useCancelSale(id: string) {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (reason: string) =>
			request(api.sales({ id }).cancel.post({ reason })),
		onSettled: invalidate,
	});
}
