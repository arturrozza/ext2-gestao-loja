import "../global.css";

import { Stack } from "expo-router";
import { AppProviders } from "@/providers/app-providers";

export default function RootLayout() {
	return (
		<AppProviders>
			<Stack />
		</AppProviders>
	);
}
