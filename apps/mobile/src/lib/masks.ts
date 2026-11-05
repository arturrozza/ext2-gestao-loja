/** Input masks for Brazilian formats. They only format digits; validation lives in the form schemas. */

export const onlyDigits = (text: string) => text.replace(/\D/g, "");

/** "(11) 98765-4321" (mobile) or "(11) 3456-7890" (landline). */
export function maskPhone(text: string): string {
	const digits = onlyDigits(text).slice(0, 11);
	if (digits.length <= 2) return digits.length ? `(${digits}` : "";
	const area = digits.slice(0, 2);
	const rest = digits.slice(2);
	const split = rest.length > 8 ? 5 : 4;
	if (rest.length <= split) return `(${area}) ${rest}`;
	return `(${area}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

/** CPF ("123.456.789-01") up to 11 digits, CNPJ ("12.345.678/0001-90") beyond that. */
export function maskDocument(text: string): string {
	const digits = onlyDigits(text).slice(0, 14);
	if (digits.length <= 11) {
		return digits
			.replace(/^(\d{3})(\d)/, "$1.$2")
			.replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
			.replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
	}
	return digits
		.replace(/^(\d{2})(\d)/, "$1.$2")
		.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
		.replace(/\.(\d{3})(\d)/, ".$1/$2")
		.replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

/** Initials for an avatar ("Mundo Madam Cosméticos" → "MM"). */
export function initials(name: string): string {
	const words = name.trim().split(/\s+/).filter(Boolean);
	return words
		.slice(0, 2)
		.map((word) => word[0]?.toUpperCase() ?? "")
		.join("");
}
