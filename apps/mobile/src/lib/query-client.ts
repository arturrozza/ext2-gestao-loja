import {
	focusManager,
	MutationCache,
	onlineManager,
	QueryCache,
	QueryClient,
} from "@tanstack/react-query";
import * as Network from "expo-network";
import { AppState, type AppStateStatus, Platform } from "react-native";
import { isApiError } from "@/lib/api-error";
import { clearSession } from "@/queries/auth/use-auth";

/** Only a network failure is worth retrying: a business error (not found, invalid...) won't change by itself. */
function shouldRetry(failureCount: number, error: unknown) {
	return failureCount < 1 && (!isApiError(error) || error.code === "network");
}

/** An expired session (30 days without use, acesso-e-loja.md) on any request sends the user back to login. */
function onError(error: unknown) {
	if (isApiError(error, "unauthorized")) clearSession(queryClient);
}

export const queryClient = new QueryClient({
	queryCache: new QueryCache({ onError }),
	mutationCache: new MutationCache({ onError }),
	defaultOptions: {
		// Online-first: without internet a request fails right away and the screen shows the error with "Tentar de
		// novo", instead of a spinner paused until the connection comes back.
		queries: { networkMode: "always", retry: shouldRetry, staleTime: 30_000 },
		mutations: { networkMode: "always" },
	},
});

onlineManager.setEventListener((setOnline) => {
	let initialised = false;

	const eventSubscription = Network.addNetworkStateListener((state) => {
		initialised = true;
		setOnline(!!state.isConnected);
	});

	Network.getNetworkStateAsync()
		.then((state) => {
			if (!initialised) {
				setOnline(!!state.isConnected);
			}
		})
		.catch(() => {
			// getNetworkStateAsync can reject on some platforms/SDK versions
		});

	return eventSubscription.remove;
});

function onAppStateChange(status: AppStateStatus) {
	if (Platform.OS !== "web") {
		focusManager.setFocused(status === "active");
	}
}

export function subscribeToAppState() {
	const subscription = AppState.addEventListener("change", onAppStateChange);
	return () => subscription.remove();
}
