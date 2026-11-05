import { Stack } from "expo-router";

/** Create and edit forms: a sheet that slides up over the screen it came from (`ScreenLayout sheet`). */
const SHEET = {
	presentation: "transparentModal",
	animation: "slide_from_bottom",
	contentStyle: { backgroundColor: "transparent" },
} as const;

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
