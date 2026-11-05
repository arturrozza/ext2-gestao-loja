import {
	type QueryClient,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { authFake } from "./auth.fake";
import type { ChangePasswordInput, SignInInput } from "./auth.types";

export const authKeys = {
	all: ["auth"] as const,
	session: ["auth", "session"] as const,
};

/**
 * Ends the session on this device: session first (the root guard sends the user to login), then the store data, so
 * nothing stays in memory for the next login.
 */
export function clearSession(queryClient: QueryClient) {
	queryClient.setQueryData(authKeys.session, null);
	queryClient.removeQueries({
		predicate: (query) => query.queryKey[0] !== authKeys.all[0],
	});
}

/** Current session, or `null` when signed out. Guards every screen but login (root `_layout`). */
export function useSession() {
	return useQuery({
		queryKey: authKeys.session,
		queryFn: authFake.session,
		staleTime: Number.POSITIVE_INFINITY,
	});
}

export function useSignIn() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: SignInInput) => authFake.signIn(input),
		onSuccess: (session) => {
			queryClient.setQueryData(authKeys.session, session);
		},
	});
}

/** Signs out and drops every cached query, so nothing from the store stays in memory. */
export function useSignOut() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: authFake.signOut,
		onSuccess: () => clearSession(queryClient),
	});
}

export function useChangePassword() {
	return useMutation({
		mutationFn: (input: ChangePasswordInput) => authFake.changePassword(input),
	});
}
