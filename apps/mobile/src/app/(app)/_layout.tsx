import { Stack } from "expo-router";
import { ScreenErrorBoundary } from "@/components/screen-error-boundary";
import { SHEET } from "@/lib/navigation";

/** Expo Router picks this export up: a screen that throws shows the error instead of closing the app. */
export const ErrorBoundary = ScreenErrorBoundary;

const SHEETS = [
	"sales/new",
	"purchases/new",
	"products/new",
	"products/[id]/edit",
	"products/[id]/adjust",
	"products/[id]/cost",
	"customers/new",
	"customers/[id]/edit",
	"resellers/new",
	"resellers/[id]/edit",
	"store/edit",
	"store/settings",
	"store/password",
	"store/users/new",
];

// Other screens slide in from the right. No fade transitions.
export default function AppLayout() {
	return (
		<Stack screenOptions={{ headerShown: false, animation: "ios_from_right" }}>
			{SHEETS.map((name) => (
				<Stack.Screen key={name} name={name} options={SHEET} />
			))}
		</Stack>
	);
}
