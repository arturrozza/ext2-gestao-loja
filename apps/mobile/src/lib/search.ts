/**
 * The search a list sends to the API: trimmed, `undefined` when blank. The API takes up to 100 characters, so a longer
 * paste still searches by its start.
 */
export function searchParam(text: string): string | undefined {
	return text.trim().slice(0, 100) || undefined;
}
