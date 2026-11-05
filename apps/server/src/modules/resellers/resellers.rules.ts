import { phoneDigits } from "../../lib/phone";
import { normalizeSearch } from "../../lib/search";
import { blankToNull, onlyDigits } from "../../lib/text";
import type { ResellersModel } from "./resellers.model";

/**
 * What the list matches for each word of a search: the word, and for a piece of a masked phone ("(11)", "9999-8888")
 * also its digits, since the phone is saved as digits. A name word made of digits ("1-2") still matches as typed.
 */
export function resellerSearchTerms(search: string | undefined): string[][] {
	return normalizeSearch(search ?? "")
		.split(" ")
		.filter(Boolean)
		.map((word) => {
			const digits = onlyDigits(word);
			return /^[\d()+.-]+$/.test(word) && digits && digits !== word
				? [word, digits]
				: [word];
		});
}

/**
 * A reseller as it's saved: trimmed name with single spaces, blanks as null, phone as digits, and the text the search
 * matches (name and phone).
 */
export function normalizeReseller(input: ResellersModel["body"]) {
	const name = input.name.trim().replace(/\s+/g, " ");
	const typedPhone = blankToNull(input.phone);
	const phone = typedPhone ? phoneDigits(typedPhone) : null;
	return {
		name,
		phone,
		defaultCommission: input.defaultCommission,
		note: blankToNull(input.note),
		searchText: normalizeSearch(`${name} ${phone ?? ""}`),
	};
}
