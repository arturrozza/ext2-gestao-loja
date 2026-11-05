import {
	keepPreviousData,
	useInfiniteQuery,
	useMutation,
	useQuery,
} from "@tanstack/react-query";
import { isApiError } from "@/lib/api-error";
import { useInvalidateBusinessData } from "@/queries/invalidate";
import { pagedQuery } from "@/queries/pagination";
import { underConstruction } from "@/queries/under-construction";
import type {
	SaleDetail,
	SaleInput,
	SaleListFilters,
	SalePage,
} from "./sales.types";

export const salesKeys = {
	all: ["sales"] as const,
	list: (filters: SaleListFilters) =>
		[...salesKeys.all, "list", filters] as const,
	detail: (id: string) => [...salesKeys.all, "detail", id] as const,
};

/** Sales list, newest first, paginated, with the totals of the filter on each page. */
export function useSales(filters: SaleListFilters) {
	return useInfiniteQuery({
		queryKey: salesKeys.list(filters),
		...pagedQuery((cursor) => underConstruction<SalePage>(filters, cursor)),
		placeholderData: keepPreviousData,
	});
}

export function useSale(id: string) {
	return useQuery({
		queryKey: salesKeys.detail(id),
		queryFn: () => underConstruction<SaleDetail>(id),
	});
}

/** A sale changes stock, reports, alerts, commissions and the home: refetch everything. */
export function useCreateSale() {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (input: SaleInput) => underConstruction<SaleDetail>(input),
		onSuccess: invalidate,
		// Someone else sold the last units: refresh, so the lines show the stock block with its shortcuts.
		onError: (error) => {
			if (isApiError(error, "insufficient_stock")) invalidate();
		},
	});
}

export function useCancelSale(id: string) {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (reason: string) => underConstruction<SaleDetail>(id, reason),
		onSuccess: invalidate,
	});
}
