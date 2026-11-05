import { QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient, subscribeToAppState } from "@/lib/query-client";

export function AppProviders({ children }: { children: ReactNode }) {
	useEffect(subscribeToAppState, []);

	return (
		<GestureHandlerRootView style={styles.root}>
			<SafeAreaProvider>
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({ root: { flex: 1 } });
