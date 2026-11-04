import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Bottom bar for a form screen (summary + submit). Sits on a card surface, no shadow. */
export function FormFooter({ children }: { children: ReactNode }) {
	const insets = useSafeAreaInsets();

	return (
		<View
			className="gap-3 border-border border-t bg-background px-5 pt-4"
			style={{ paddingBottom: insets.bottom + 12 }}
		>
			{children}
		</View>
	);
}
