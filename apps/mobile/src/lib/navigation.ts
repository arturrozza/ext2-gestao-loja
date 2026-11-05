import type { useRouter } from "expo-router";

/** Back to the previous screen; a screen opened with nothing behind it (a link) goes home instead. */
export function leaveScreen(router: ReturnType<typeof useRouter>) {
	if (router.canGoBack()) router.back();
	else router.replace("/");
}

/** Create and edit forms: a sheet that slides up over the screen it came from (`ScreenLayout sheet`). */
export const SHEET = {
	presentation: "transparentModal",
	animation: "slide_from_bottom",
	contentStyle: { backgroundColor: "transparent" },
} as const;
