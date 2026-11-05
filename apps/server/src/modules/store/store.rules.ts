import { httpError } from "../../lib/http-error";
import { phoneDigits } from "../../lib/phone";
import { blankToNull, onlyDigits } from "../../lib/text";
import type { StoreModel } from "./store.model";

const digits = (value: string) => onlyDigits(value).length;

const invalid = (field: string, message: string) =>
	httpError(422, { code: "validation", message, field });

/** Store data as it's saved: trimmed, blanks as null, CPF/CNPJ and phone checked by their digit count (both kept masked). */
export function normalizeProfile(
	input: StoreModel["profile"],
): StoreModel["profile"] {
	const profile = {
		name: input.name.trim(),
		document: blankToNull(input.document),
		phone: blankToNull(input.phone),
		address: blankToNull(input.address),
	};
	if (profile.document && ![11, 14].includes(digits(profile.document))) {
		throw invalid(
			"document",
			"Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).",
		);
	}
	// Checked by its digits, kept as typed (with the mask).
	if (profile.phone) phoneDigits(profile.phone);
	return profile;
}
