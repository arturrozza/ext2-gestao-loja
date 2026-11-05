import {
	keepPreviousData,
	useInfiniteQuery,
	useMutation,
	useQueries,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { api, request } from "@/lib/api";
import { useInvalidateBusinessData } from "@/queries/invalidate";
import { type Page, pagedQuery } from "@/queries/pagination";
import { underConstruction } from "@/queries/under-construction";
import type {
	Category,
	CostCorrectionInput,
	Movement,
	ProductDetail,
	ProductInput,
	ProductListFilters,
	ProductListPage,
	StockAdjustmentInput,
	StockListFilters,
} from "./products.types";

export const productsKeys = {
	all: ["products"] as const,
	lists: () => [...productsKeys.all, "list"] as const,
	list: (filters: ProductListFilters) =>
		[...productsKeys.lists(), filters] as const,
	detail: (id: string) => [...productsKeys.all, "detail", id] as const,
	categories: () => [...productsKeys.all, "categories"] as const,
	stock: () => [...productsKeys.all, "stock"] as const,
};

/** The API's list query: only the filters that narrow something. */
function listQuery(filters: ProductListFilters, cursor: number) {
	return {
		// The API takes up to 100 characters; a longer paste still searches by its start.
		search: filters.search.trim().slice(0, 100) || undefined,
		categoryIds: filters.categoryIds.length ? filters.categoryIds : undefined,
		archived: filters.archived,
		cursor,
	};
}

/**
 * Paginated product list (the catalog can be huge): next pages load as the list scrolls. Keeps the previous result
 * while a new search or filter loads, so the list doesn't flash.
 */
export function useProducts(filters: ProductListFilters) {
	return useInfiniteQuery({
		queryKey: productsKeys.list(filters),
		...pagedQuery((cursor) =>
			request(api.products.get({ query: listQuery(filters, cursor) })),
		),
		placeholderData: keepPreviousData,
	});
}

export function useProduct(id: string) {
	return useQuery({
		queryKey: productsKeys.detail(id),
		queryFn: () => request(api.products({ id }).get()),
	});
}

/** A product change shows in the list, the categories' counts and the home, so all business data is refetched. */
export function useCreateProduct() {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (input: ProductInput) => request(api.products.post(input)),
		onSuccess: invalidate,
	});
}

export function useUpdateProduct(id: string) {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (input: ProductInput) =>
			request(api.products({ id }).put(input)),
		onSuccess: invalidate,
	});
}

export function useSetProductArchived(id: string) {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (archived: boolean) => {
			const product = api.products({ id });
			return request(
				archived ? product.archive.post() : product.reactivate.post(),
			);
		},
		onSuccess: invalidate,
	});
}

/** Every category of the store, archived ones included (they're kept apart on screen), by name. */
export function useCategories() {
	return useQuery({
		queryKey: productsKeys.categories(),
		queryFn: () => request(api.categories.get()),
	});
}

/**
 * Categories show on products: a change refetches them too. A new one goes into the cache at once, so the form that
 * created it can select it before the refetch.
 */
export function useCreateCategory() {
	const queryClient = useQueryClient();
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (name: string) => request(api.categories.post({ name })),
		onSuccess: (category) => {
			queryClient.setQueryData<Category[]>(productsKeys.categories(), (list) =>
				list ? [...list, category] : list,
			);
			invalidate();
		},
	});
}

export function useRenameCategory() {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: ({ id, name }: { id: string; name: string }) =>
			request(api.categories({ id }).put({ name })),
		onSuccess: invalidate,
	});
}

/** Archive (hidden from the pickers, products keep it) or reactivate a category. */
export function useSetCategoryArchived() {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: ({ id, archived }: { id: string; archived: boolean }) => {
			const category = api.categories({ id });
			return request(
				archived ? category.archive.post() : category.reactivate.post(),
			);
		},
		onSuccess: invalidate,
	});
}

/*
 * Stock (MUN-12/13): under construction. The screens of sales, purchases and stock corrections use these and aren't
 * reachable yet.
 */

/** Products with their stock, for the picker of sales and purchases. Only fetches while `enabled`. */
export function useStockProducts(filters: StockListFilters, enabled = true) {
	return useInfiniteQuery({
		queryKey: [...productsKeys.stock(), "list", filters],
		...pagedQuery((cursor) =>
			underConstruction<ProductListPage>(filters, cursor),
		),
		placeholderData: keepPreviousData,
		enabled,
	});
}

/** `id` undefined: nothing to load (e.g. an optional `?productId=`). */
export function useStockProduct(id: string | undefined) {
	return useQuery({
		queryKey: [...productsKeys.stock(), "detail", id ?? ""],
		queryFn: () => underConstruction<ProductDetail>(id),
		enabled: Boolean(id),
	});
}

/** Live stock of several products (e.g. the lines of a sale), keyed by id. */
export function useStockProductsById(ids: string[]) {
	const results = useQueries({
		queries: ids.map((id) => ({
			queryKey: [...productsKeys.stock(), "detail", id],
			queryFn: () => underConstruction<ProductDetail>(id),
		})),
	});
	const products = new Map<string, ProductDetail>();
	for (const { data } of results) {
		if (data) products.set(data.id, data);
	}
	return products;
}

/** Ledger of a product, newest first, paginated (it only grows). */
export function useProductMovements(id: string) {
	return useInfiniteQuery({
		queryKey: [...productsKeys.stock(), "movements", id],
		...pagedQuery((cursor) => underConstruction<Page<Movement>>(id, cursor)),
	});
}

export function useAdjustStock(id: string) {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (input: StockAdjustmentInput) =>
			underConstruction<ProductDetail>(id, input),
		onSuccess: invalidate,
	});
}

export function useCorrectCost(id: string) {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (input: CostCorrectionInput) =>
			underConstruction<ProductDetail>(id, input),
		onSuccess: invalidate,
	});
}
