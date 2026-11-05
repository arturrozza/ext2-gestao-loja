import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { api, request } from "@/lib/api";
import { searchParam } from "@/lib/search";
import { useInvalidateBusinessData } from "@/queries/invalidate";
import type { ResellerInput, ResellerListFilters } from "./resellers.types";

export const resellersKeys = {
	all: ["resellers"] as const,
	list: (filters: ResellerListFilters) =>
		[...resellersKeys.all, "list", filters] as const,
	detail: (id: string) => [...resellersKeys.all, "detail", id] as const,
};

/** Resellers are a handful per store: a plain list, no pagination. Keeps the previous result while a search loads. */
export function useResellers(filters: ResellerListFilters) {
	return useQuery({
		queryKey: resellersKeys.list(filters),
		queryFn: () =>
			request(
				api.resellers.get({
					query: {
						search: searchParam(filters.search),
						archived: filters.archived,
					},
				}),
			),
		placeholderData: keepPreviousData,
	});
}

export function useReseller(id: string) {
	return useQuery({
		queryKey: resellersKeys.detail(id),
		queryFn: () => request(api.resellers({ id }).get()),
	});
}

/** A reseller shows on sales, reports and the home, so all business data is refetched after a change. */
export function useCreateReseller() {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (input: ResellerInput) => request(api.resellers.post(input)),
		onSuccess: invalidate,
	});
}

export function useUpdateReseller(id: string) {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (input: ResellerInput) =>
			request(api.resellers({ id }).put(input)),
		onSuccess: invalidate,
	});
}

export function useSetResellerArchived(id: string) {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (archived: boolean) => {
			const reseller = api.resellers({ id });
			return request(
				archived ? reseller.archive.post() : reseller.reactivate.post(),
			);
		},
		onSuccess: invalidate,
	});
}
