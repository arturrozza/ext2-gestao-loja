import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/queries/auth/use-auth";
import { storeFake } from "./store.fake";
import type { StoreProfile, StoreSettings } from "./store.types";

export const storeKeys = {
	all: ["store"] as const,
	profile: () => [...storeKeys.all, "profile"] as const,
	settings: () => [...storeKeys.all, "settings"] as const,
};

export function useStoreProfile() {
	return useQuery({
		queryKey: storeKeys.profile(),
		queryFn: storeFake.profile,
	});
}

export function useUpdateStoreProfile() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: StoreProfile) => storeFake.updateProfile(input),
		onSuccess: (profile) => {
			queryClient.setQueryData(storeKeys.profile(), profile);
			// The session carries the store name (home greeting).
			queryClient.invalidateQueries({ queryKey: authKeys.session });
		},
	});
}

export function useStoreSettings() {
	return useQuery({
		queryKey: storeKeys.settings(),
		queryFn: storeFake.settings,
	});
}

/** Settings feed sale defaults and alerts, so everything derived from them is refetched. */
export function useUpdateStoreSettings() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: StoreSettings) => storeFake.updateSettings(input),
		onSuccess: () => {
			queryClient.invalidateQueries({
				predicate: (query) => query.queryKey[0] !== authKeys.all[0],
			});
		},
	});
}
