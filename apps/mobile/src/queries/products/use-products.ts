import {
	keepPreviousData,
	useInfiniteQuery,
	useMutation,
	useQueries,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useInvalidateBusinessData } from "@/queries/invalidate";
import { pagedQuery } from "@/queries/pagination";
import { productsFake } from "./products.fake";
import type {
	CostCorrectionInput,
	ProductDetail,
	ProductInput,
	ProductListFilters,
	StockAdjustmentInput,
} from "./products.types";

export const productsKeys = {
	all: ["products"] as const,
	lists: () => [...productsKeys.all, "list"] as const,
	list: (filters: ProductListFilters) =>
		[...productsKeys.lists(), filters] as const,
	detail: (id: string) => [...productsKeys.all, "detail", id] as const,
	movements: (id: string) => [...productsKeys.all, "movements", id] as const,
	categories: () => [...productsKeys.all, "categories"] as const,
};

/**
 * Paginated product list (the catalog can be huge): next pages load as the list scrolls. Keeps the previous result
 * while a new search or filter loads, so the list doesn't flash.
 */
export function useProducts(filters: ProductListFilters, enabled = true) {
	return useInfiniteQuery({
		queryKey: productsKeys.list(filters),
		...pagedQuery((cursor) => productsFake.list(filters, cursor)),
		placeholderData: keepPreviousData,
		enabled,
	});
}

/** Ledger of a product, newest first, paginated (it only grows). */
export function useProductMovements(id: string) {
	return useInfiniteQuery({
		queryKey: productsKeys.movements(id),
		...pagedQuery((cursor) => productsFake.movements(id, cursor)),
	});
}

/** `id` undefined: nothing to load (e.g. an optional `?productId=`). */
export function useProduct(id: string | undefined) {
	return useQuery({
		queryKey: productsKeys.detail(id ?? ""),
		queryFn: () => productsFake.detail(id ?? ""),
		enabled: Boolean(id),
	});
}

/** Live data of several products (e.g. the lines of a sale), keyed by id. Refreshes with the rest of the app. */
export function useProductsById(ids: string[]) {
	const results = useQueries({
		queries: ids.map((id) => ({
			queryKey: productsKeys.detail(id),
			queryFn: () => productsFake.detail(id),
		})),
	});
	const products = new Map<string, ProductDetail>();
	for (const { data } of results) {
		if (data) products.set(data.id, data);
	}
	return products;
}

export function useCategories() {
	return useQuery({
		queryKey: productsKeys.categories(),
		queryFn: productsFake.categories,
	});
}

export function useCreateProduct() {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (input: ProductInput) => productsFake.create(input),
		onSuccess: invalidate,
	});
}

export function useUpdateProduct(id: string) {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (input: ProductInput) => productsFake.update(id, input),
		onSuccess: invalidate,
	});
}

export function useSetProductArchived(id: string) {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (archived: boolean) => productsFake.setArchived(id, archived),
		onSuccess: invalidate,
	});
}

export function useAdjustStock(id: string) {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (input: StockAdjustmentInput) =>
			productsFake.adjustStock(id, input),
		onSuccess: invalidate,
	});
}

export function useCorrectCost(id: string) {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (input: CostCorrectionInput) =>
			productsFake.correctCost(id, input),
		onSuccess: invalidate,
	});
}

export function useCreateCategory() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (name: string) => productsFake.createCategory(name),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: productsKeys.categories() }),
	});
}
