import { httpError } from "./http-error";
import { onlyDigits } from "./text";

/**
 * The digits of a phone with the area code: 10 (landline) or 11 (mobile), masked or not. Anything else is a 422 on
 * the `phone` field.
 */
export function phoneDigits(phone: string): string {
	const digits = onlyDigits(phone);
	if (digits.length !== 10 && digits.length !== 11) {
		throw httpError(422, {
			code: "validation",
			message: "Informe o telefone com DDD.",
			field: "phone",
		});
	}
	return digits;
}
