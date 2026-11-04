import type { z } from "zod";

/** First error message per top-level field, for showing inline under each input. */
export function formErrors(error: z.ZodError): Record<string, string> {
	const errors: Record<string, string> = {};
	for (const issue of error.issues) {
		const key = String(issue.path[0] ?? "form");
		errors[key] ??= issue.message;
	}
	return errors;
}
