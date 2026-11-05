import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { useInvalidateBusinessData } from "@/queries/invalidate";
import { pagedQuery } from "@/queries/pagination";
import { underConstruction } from "@/queries/under-construction";
import type {
	PurchaseDetail,
	PurchaseInput,
	PurchaseListFilters,
	PurchasePage,
} from "./purchases.types";

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
		...pagedQuery((cursor) => underConstruction<PurchasePage>(filters, cursor)),
	});
}

export function usePurchase(id: string) {
	return useQuery({
		queryKey: purchasesKeys.detail(id),
		queryFn: () => underConstruction<PurchaseDetail>(id),
	});
}

/** Purchases change stock and cost, which feed products, alerts, reports and the home: refetch everything. */
export function useCreatePurchase() {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (input: PurchaseInput) =>
			underConstruction<PurchaseDetail>(input),
		onSuccess: invalidate,
	});
}

export function useCancelPurchase(id: string) {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: () => underConstruction<PurchaseDetail>(id),
		onSuccess: invalidate,
	});
}
