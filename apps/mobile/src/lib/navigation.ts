import type { useRouter } from "expo-router";

/** Back to the previous screen; a screen opened with nothing behind it (a link) goes home instead. */
export function leaveScreen(router: ReturnType<typeof useRouter>) {
	if (router.canGoBack()) router.back();
	else router.replace("/");
}

/**
 * Create and edit forms: a sheet over the screen it came from. The navigator only puts it there; the slide and the
 * dimmed backdrop are the sheet's own (`sheetRoute`), so the route file must export `sheetRoute(Screen)`.
 */
export const SHEET = {
	presentation: "transparentModal",
	animation: "none",
	contentStyle: { backgroundColor: "transparent" },
} as const;
