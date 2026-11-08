import { like, or, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { phoneDigits } from "./phone";
import { likePattern, normalizeSearch } from "./search";
import { blankToNull, onlyDigits } from "./text";

/** What a person record (customer, reseller) shares: a name, an optional phone and an optional note. */
export type PersonInput = {
	name: string;
	phone: string | null;
	note: string | null;
};

/**
 * A person as it's saved: trimmed name with single spaces, blanks as null, phone as digits, and the text the search
 * matches (name and phone).
 */
export function normalizePerson(input: PersonInput) {
	const name = input.name.trim().replace(/\s+/g, " ");
	const typedPhone = blankToNull(input.phone);
	const phone = typedPhone ? phoneDigits(typedPhone) : null;
	return {
		name,
		phone,
		note: blankToNull(input.note),
		searchText: normalizeSearch(`${name} ${phone ?? ""}`),
	};
}

/**
 * What a person search matches for each word: the word, and for a piece of a masked phone ("(11)", "9999-8888") also
 * its digits, since the phone is saved as digits. A name word made of digits ("1-2") still matches as typed.
 */
export function personSearchTerms(search: string | undefined): string[][] {
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

/** One condition per search word: the person's `searchText` has it (or, for a masked phone piece, its digits). */
export function personSearchFilter(
	searchText: PgColumn,
	search: string | undefined,
): (SQL | undefined)[] {
	return personSearchTerms(search).map((alternatives) =>
		or(...alternatives.map((term) => like(searchText, likePattern(term)))),
	);
}
