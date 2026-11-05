import {
	keepPreviousData,
	useInfiniteQuery,
	useMutation,
	useQuery,
} from "@tanstack/react-query";
import { useInvalidateBusinessData } from "@/queries/invalidate";
import { pagedQuery } from "@/queries/pagination";
import { underConstruction } from "@/queries/under-construction";
import type {
	Customer,
	CustomerInput,
	CustomerListFilters,
	CustomerPage,
} from "./customers.types";

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
		...pagedQuery((cursor) => underConstruction<CustomerPage>(filters, cursor)),
		placeholderData: keepPreviousData,
	});
}

export function useCustomer(id: string) {
	return useQuery({
		queryKey: customersKeys.detail(id),
		queryFn: () => underConstruction<Customer>(id),
	});
}

export function useCreateCustomer() {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (input: CustomerInput) => underConstruction<Customer>(input),
		onSuccess: invalidate,
	});
}

export function useUpdateCustomer(id: string) {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (input: CustomerInput) =>
			underConstruction<Customer>(id, input),
		onSuccess: invalidate,
	});
}

export function useSetCustomerArchived(id: string) {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (archived: boolean) =>
			underConstruction<Customer>(id, archived),
		onSuccess: invalidate,
	});
}
