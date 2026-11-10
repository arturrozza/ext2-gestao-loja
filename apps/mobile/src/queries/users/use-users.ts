import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, request } from "@/lib/api";
import type { NewUserInput } from "./users.types";

const usersKeys = {
	all: ["users"] as const,
	list: () => [...usersKeys.all, "list"] as const,
};

/** The store's users, active and deactivated, by name. */
export function useUsers() {
	return useQuery({
		queryKey: usersKeys.list(),
		queryFn: () => request(api.users.get()),
	});
}

export function useCreateUser() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: NewUserInput) => request(api.users.post(input)),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKeys.all }),
	});
}

/** Deactivate (`active: false`, ends their sessions) or reactivate a user. */
export function useSetUserActive() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, active }: { id: string; active: boolean }) => {
			const user = api.users({ id });
			return request(active ? user.reactivate.post() : user.deactivate.post());
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKeys.all }),
	});
}
