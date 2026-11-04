import { Stack } from "expo-router";

// Every screen, forms included, slides in from the right. No fade transitions.
export default function MockLayout() {
	return (
		<Stack
			screenOptions={{ headerShown: false, animation: "ios_from_right" }}
		/>
	);
}
