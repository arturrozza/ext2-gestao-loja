import { QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient, subscribeToAppState } from "@/lib/query-client";

export function AppProviders({ children }: { children: ReactNode }) {
	useEffect(subscribeToAppState, []);

	return (
		<SafeAreaProvider>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</SafeAreaProvider>
	);
}
