import {
	keepPreviousData,
	useInfiniteQuery,
	useMutation,
	useQueries,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { api, request, uploadFile } from "@/lib/api";
import { isApiError } from "@/lib/api-error";
import { searchParam } from "@/lib/search";
import { useInvalidateBusinessData } from "@/queries/invalidate";
import { type Page, pagedQuery } from "@/queries/pagination";
import { underConstruction } from "@/queries/under-construction";
import type {
	Category,
	CostCorrectionInput,
	Movement,
	PhotoChange,
	ProductDetail,
	ProductInput,
	ProductListFilters,
	ProductListPage,
	ProductSave,
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
		search: searchParam(filters.search),
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

/** The answer of `POST /products/photos` (`api.products.photos`, sent with `uploadFile` instead of Eden). */
function readUploadedPhoto(value: unknown): string | null {
	const key = (value as { key?: unknown } | null)?.key;
	return typeof key === "string" && key ? key : null;
}

/**
 * Keys of photos already sent, by local file: saving again after a refused save (a repeated code, no internet) reuses
 * the key instead of sending the same photo once more. A shrunk photo gets a new file each time it is picked.
 */
const sentPhotos = new Map<string, string>();

/** The photo the app already shrank goes to the API first; its key goes in the save. */
async function photoKeyOf(
	photo: PhotoChange,
): Promise<string | null | undefined> {
	if (!photo) return photo;
	const sent = sentPhotos.get(photo.uri);
	if (sent) return sent;
	const key = await uploadFile("/products/photos", photo.uri, {
		fieldName: "photo",
		mimeType: "image/jpeg",
		read: readUploadedPhoto,
	});
	sentPhotos.set(photo.uri, key);
	return key;
}

/**
 * A save with its photo: a new photo is sent first, then the product points at it. The key is kept for a retry until
 * the product is saved, or until the API refuses it (the next save sends the photo again).
 */
async function saveWithPhoto<T>(
	{ photo, ...rest }: ProductSave,
	send: (input: ProductInput) => Promise<T>,
): Promise<T> {
	try {
		const saved = await send({ ...rest, photoKey: await photoKeyOf(photo) });
		if (photo) sentPhotos.delete(photo.uri);
		return saved;
	} catch (error) {
		if (photo && isApiError(error) && error.details.field === "photoKey") {
			sentPhotos.delete(photo.uri);
		}
		throw error;
	}
}

/** A product change shows in the list, the categories' counts and the home, so all business data is refetched. */
export function useCreateProduct() {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (save: ProductSave) =>
			saveWithPhoto(save, (input) => request(api.products.post(input))),
		onSuccess: invalidate,
	});
}

export function useUpdateProduct(id: string) {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (save: ProductSave) =>
			saveWithPhoto(save, (input) => request(api.products({ id }).put(input))),
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
