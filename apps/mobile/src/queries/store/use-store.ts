import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, request } from "@/lib/api";
import { authKeys } from "@/queries/auth/use-auth";
import { mirrorSettings } from "@/queries/fake/fake-settings";
import type { StoreProfile, StoreSettings } from "./store.types";

export const storeKeys = {
	all: ["store"] as const,
	profile: () => [...storeKeys.all, "profile"] as const,
	settings: () => [...storeKeys.all, "settings"] as const,
};

export function useStoreProfile() {
	return useQuery({
		queryKey: storeKeys.profile(),
		queryFn: () => request(api.store.get()),
	});
}

export function useUpdateStoreProfile() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: StoreProfile) => request(api.store.put(input)),
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
		queryFn: () => request(api.store.settings.get()).then(mirrorSettings),
	});
}

/** Settings feed sale defaults and alerts, so everything derived from them is refetched. */
export function useUpdateStoreSettings() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: StoreSettings) =>
			request(api.store.settings.put(input)).then(mirrorSettings),
		onSuccess: () => {
			queryClient.invalidateQueries({
				predicate: (query) => query.queryKey[0] !== authKeys.all[0],
			});
		},
	});
}
