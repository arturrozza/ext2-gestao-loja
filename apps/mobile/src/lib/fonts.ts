import {
	PlusJakartaSans_400Regular,
	PlusJakartaSans_500Medium,
	PlusJakartaSans_600SemiBold,
	PlusJakartaSans_700Bold,
	useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";

// Keys are the family names used by `fontFamily` in tailwind.config.js.
const APP_FONTS = {
	PlusJakartaSans_400Regular,
	PlusJakartaSans_500Medium,
	PlusJakartaSans_600SemiBold,
	PlusJakartaSans_700Bold,
};

/** Loads the app fonts. Returns true once they're ready (or failed, falling back to the system font). */
export function useAppFonts() {
	const [loaded, error] = useFonts(APP_FONTS);
	return loaded || error !== null;
}
