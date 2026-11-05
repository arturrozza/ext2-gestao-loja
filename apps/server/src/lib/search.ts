/** Lowercase without accents and with single spaces, so "Perfúme  ÁGUA" is stored and searched as "perfume agua". */
export function normalizeSearch(text: string): string {
	return text
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim();
}

/** The words of a search, each one a `LIKE` pattern that finds it anywhere ("floral perfume" → two patterns). */
export function searchPatterns(query: string | undefined): string[] {
	if (!query) return [];
	return normalizeSearch(query)
		.split(" ")
		.filter(Boolean)
		.map((word) => `%${word.replace(/[\\%_]/g, "\\$&")}%`);
}
