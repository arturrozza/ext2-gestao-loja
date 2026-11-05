let last = 0;

/** Unique key for a line being typed in a form (sale or purchase items, sale costs). */
export function nextDraftKey(): string {
	last += 1;
	return `draft-${last}`;
}
