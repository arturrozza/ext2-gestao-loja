import {
	Manrope_400Regular,
	Manrope_500Medium,
	Manrope_600SemiBold,
	Manrope_700Bold,
	useFonts,
} from "@expo-google-fonts/manrope";

// Keys are the family names used by `fontFamily` in tailwind.config.js.
const APP_FONTS = {
	Manrope_400Regular,
	Manrope_500Medium,
	Manrope_600SemiBold,
	Manrope_700Bold,
};

/** Loads the app fonts. Returns true once they're ready (or failed, falling back to the system font). */
export function useAppFonts() {
	const [loaded, error] = useFonts(APP_FONTS);
	return loaded || error !== null;
}
