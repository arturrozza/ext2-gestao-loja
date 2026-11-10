import { Alert, Linking } from "react-native";

/** Phones are saved with the area code and without the country (masks.ts): the store sells in Brazil. */
const BRAZIL = "55";

/**
 * Opens the WhatsApp chat with a saved phone (digits, with area code). The link opens the app, or the browser when
 * it isn't installed. A failure is an alert, not a toast: the toast confirms that something worked.
 */
export async function openWhatsApp(phone: string) {
	try {
		await Linking.openURL(`https://wa.me/${BRAZIL}${phone}`);
	} catch {
		Alert.alert("Não foi possível abrir o WhatsApp.");
	}
}
