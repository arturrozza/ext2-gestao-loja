import { httpError } from "../../lib/http-error";
import type { StoreModel } from "./store.model";

const digits = (value: string) => value.replace(/\D/g, "").length;

const invalid = (field: string, message: string) =>
	httpError(422, { code: "validation", message, field });

/** Blank optional text is "not informed". */
function blankToNull(value: string | null): string | null {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}

/** Store data as it's saved: trimmed, blanks as null, CPF/CNPJ and phone checked by their digit count. */
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
	if (profile.phone && ![10, 11].includes(digits(profile.phone))) {
		throw invalid("phone", "Informe o telefone com DDD.");
	}
	return profile;
}
