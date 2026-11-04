import { Stack } from "expo-router";

// Inner screens slide in from the right; forms rise from the bottom with a fade.
export default function MockLayout() {
	return (
		<Stack screenOptions={{ headerShown: false, animation: "ios_from_right" }}>
			<Stack.Screen
				name="new-sale"
				options={{ animation: "fade_from_bottom" }}
			/>
			<Stack.Screen
				name="new-product"
				options={{ animation: "fade_from_bottom" }}
			/>
			<Stack.Screen
				name="new-purchase"
				options={{ animation: "fade_from_bottom" }}
			/>
		</Stack>
	);
}
