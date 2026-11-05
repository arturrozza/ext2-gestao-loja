import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useInvalidateBusinessData } from "@/queries/invalidate";
import { resellersFake } from "./resellers.fake";
import type { ResellerInput, ResellerListFilters } from "./resellers.types";

export const resellersKeys = {
	all: ["resellers"] as const,
	list: (filters: ResellerListFilters) =>
		[...resellersKeys.all, "list", filters] as const,
	detail: (id: string) => [...resellersKeys.all, "detail", id] as const,
};

/** Resellers are a handful per store: a plain list, no pagination. */
export function useResellers(filters: ResellerListFilters) {
	return useQuery({
		queryKey: resellersKeys.list(filters),
		queryFn: () => resellersFake.list(filters),
		placeholderData: keepPreviousData,
	});
}

export function useReseller(id: string) {
	return useQuery({
		queryKey: resellersKeys.detail(id),
		queryFn: () => resellersFake.detail(id),
	});
}

export function useCreateReseller() {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (input: ResellerInput) => resellersFake.create(input),
		onSuccess: invalidate,
	});
}

export function useUpdateReseller(id: string) {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (input: ResellerInput) => resellersFake.update(id, input),
		onSuccess: invalidate,
	});
}

export function useSetResellerArchived(id: string) {
	const invalidate = useInvalidateBusinessData();
	return useMutation({
		mutationFn: (archived: boolean) => resellersFake.setArchived(id, archived),
		onSuccess: invalidate,
	});
}
