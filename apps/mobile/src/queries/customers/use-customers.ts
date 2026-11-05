import {
	keepPreviousData,
	useInfiniteQuery,
	useMutation,
	useQuery,
} from "@tanstack/react-query";
import { useInvalidateBusinessData } from "@/queries/invalidate";
import { pagedQuery } from "@/queries/pagination";
import { customersFake } from "./customers.fake";
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
		...pagedQuery((cursor) => customersFake.list(filters, cursor)),
		placeholderData: keepPreviousData,
	});
}

export function useCustomer(id: string) {
	return useQuery({
		queryKey: customersKeys.detail(id),
		queryFn: () => customersFake.detail(id),
	});
}

export function useCreateCustomer() {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (input: CustomerInput) => customersFake.create(input),
		onSuccess: invalidate,
	});
}

export function useUpdateCustomer(id: string) {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (input: CustomerInput) => customersFake.update(id, input),
		onSuccess: invalidate,
	});
}

export function useSetCustomerArchived(id: string) {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (archived: boolean) => customersFake.setArchived(id, archived),
		onSuccess: invalidate,
	});
}
