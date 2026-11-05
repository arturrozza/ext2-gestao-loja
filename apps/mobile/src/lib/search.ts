/** Lowercase without accents, so "perfume" finds "Perfúme" and "ÁGUA" finds "agua". */
export function normalizeSearch(text: string): string {
	return text
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

/** Every word of the query has to appear in some field: "floral perfume" finds "Perfume Floral 100ml". */
export function matchesSearch(
	query: string,
	...fields: (string | null | undefined)[]
): boolean {
	const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
	const haystack = normalizeSearch(fields.filter(Boolean).join(" "));
	return words.every((word) => haystack.includes(word));
}

/**
 * The search a list sends to the API: trimmed, `undefined` when blank. The API takes up to 100 characters, so a longer
 * paste still searches by its start.
 */
export function searchParam(text: string): string | undefined {
	return text.trim().slice(0, 100) || undefined;
}
