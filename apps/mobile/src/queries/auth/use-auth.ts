import {
	type QueryClient,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { api, request } from "@/lib/api";
import { isApiError } from "@/lib/api-error";
import { sessionToken } from "@/lib/session-token";
import type { ChangePasswordInput, Session, SignInInput } from "./auth.types";

export const authKeys = {
	all: ["auth"] as const,
	session: ["auth", "session"] as const,
};

/**
 * Ends the session on this device: the token goes, then the session (the root guard sends the user to the welcome
 * screen), then the store data, so nothing stays in memory for the next login.
 */
export function clearSession(queryClient: QueryClient) {
	// Not awaited: the memory copy is cleared at once (no request sends it again) and the keychain follows. If the
	// keychain fails, the API still answers 401 for this session next time, so there's nothing better to do here.
	sessionToken.clear().catch(() => undefined);
	queryClient.setQueryData(authKeys.session, null);
	queryClient.removeQueries({
		predicate: (query) => query.queryKey[0] !== authKeys.all[0],
	});
}

/** The saved token's session; `null` without a token or when the API says it's over (30 days without use). */
async function loadSession(): Promise<Session | null> {
	if (!(await sessionToken.load())) return null;
	try {
		return await request(api.auth.session.get());
	} catch (error) {
		if (!isApiError(error, "unauthorized")) throw error;
		await sessionToken.clear();
		return null;
	}
}

/** Current session, or `null` when signed out. Guards every screen but the welcome and login ones (root `_layout`). */
export function useSession() {
	return useQuery({
		queryKey: authKeys.session,
		queryFn: loadSession,
		staleTime: Number.POSITIVE_INFINITY,
	});
}

export function useSignIn() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: SignInInput) => {
			const { token, ...session } = await request(
				api.auth["sign-in"].post(input),
			);
			await sessionToken.save(token);
			return session;
		},
		onSuccess: (session) => {
			queryClient.setQueryData(authKeys.session, session);
		},
	});
}

/**
 * Signs out and drops every cached query, so nothing from the store stays in memory. The device forgets the session
 * even if the API can't be reached (it expires there on its own).
 */
export function useSignOut() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => request(api.auth["sign-out"].post()).catch(() => null),
		onSettled: () => clearSession(queryClient),
	});
}

/** Other devices signed in as this user are signed out by the API; this one stays. */
export function useChangePassword() {
	return useMutation({
		mutationFn: (input: ChangePasswordInput) =>
			request(api.auth.password.post(input)),
	});
}
