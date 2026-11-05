import type { useRouter } from "expo-router";

/** Back to the previous screen; a screen opened with nothing behind it (a link) goes home instead. */
export function leaveScreen(router: ReturnType<typeof useRouter>) {
	if (router.canGoBack()) router.back();
	else router.replace("/");
}
