import {
	keepPreviousData,
	useInfiniteQuery,
	useMutation,
	useQuery,
} from "@tanstack/react-query";
import { api, request } from "@/lib/api";
import { searchParam } from "@/lib/search";
import { useInvalidateBusinessData } from "@/queries/invalidate";
import { pagedQuery } from "@/queries/pagination";
import type { CustomerInput, CustomerListFilters } from "./customers.types";

export const customersKeys = {
	all: ["customers"] as const,
	list: (filters: CustomerListFilters) =>
		[...customersKeys.all, "list", filters] as const,
	detail: (id: string) => [...customersKeys.all, "detail", id] as const,
};

/** Customers can be many: paginated, searched by name or phone. */
export function useCustomers(filters: CustomerListFilters) {
	return useInfiniteQuery({
		queryKey: customersKeys.list(filters),
		...pagedQuery((cursor) =>
			request(
				api.customers.get({
					query: {
						search: searchParam(filters.search),
						archived: filters.archived,
						cursor,
					},
				}),
			),
		),
		placeholderData: keepPreviousData,
	});
}

export function useCustomer(id: string) {
	return useQuery({
		queryKey: customersKeys.detail(id),
		queryFn: () => request(api.customers({ id }).get()),
	});
}

/** A customer shows on sales and the home, so all business data is refetched after a change. */
export function useCreateCustomer() {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (input: CustomerInput) => request(api.customers.post(input)),
		onSuccess: invalidate,
	});
}

export function useUpdateCustomer(id: string) {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (input: CustomerInput) =>
			request(api.customers({ id }).put(input)),
		onSuccess: invalidate,
	});
}

export function useSetCustomerArchived(id: string) {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (archived: boolean) => {
			const customer = api.customers({ id });
			return request(
				archived ? customer.archive.post() : customer.reactivate.post(),
			);
		},
		onSuccess: invalidate,
	});
}
