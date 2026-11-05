/** Blank optional text is "not informed": trimmed, or `null`. */
export function blankToNull(value: string | null): string | null {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}

/** Only the digits of a masked value ("(11) 99999-8888" → "11999998888"). */
export function onlyDigits(value: string): string {
	return value.replace(/\D/g, "");
}
