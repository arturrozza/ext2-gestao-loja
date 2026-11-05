import { Stack } from "expo-router";
import { SHEET } from "@/lib/navigation";

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
