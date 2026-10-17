import {
	focusManager,
	onlineManager,
	QueryClient,
} from "@tanstack/react-query";
import * as Network from "expo-network";
import { AppState, type AppStateStatus, Platform } from "react-native";

export const queryClient = new QueryClient();

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
