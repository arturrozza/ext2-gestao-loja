import type { z } from "zod";

/**
 * First error message per field path, for showing inline under each input. Nested fields are joined with dots
 * ("items.0.quantity").
 */
export function formErrors(error: z.ZodError): Record<string, string> {
	const errors: Record<string, string> = {};
	for (const issue of error.issues) {
		const key = issue.path.length ? issue.path.map(String).join(".") : "form";
		errors[key] ??= issue.message;
	}
	return errors;
}
