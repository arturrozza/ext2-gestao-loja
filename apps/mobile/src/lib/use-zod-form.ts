import { useState } from "react";
import type { z } from "zod";
import { isApiError } from "@/lib/api-error";
import { errorMessage } from "@/lib/errors";
import { formErrors } from "@/lib/form-errors";

/**
 * Form state validated by a Zod schema. Errors show up only after the first submit attempt (docs/conventions.md,
 * "Formulários"). API errors about a field (`details.field`) go under that field (`applyApiError` in the mutation's
 * `onError`); the others go to the footer (`footerError`).
 */
export function useZodForm<
	S extends z.ZodType<unknown, Record<string, unknown>>,
>(schema: S, initial: z.input<S>) {
	const [values, setValues] = useState<z.input<S>>(initial);
	const [submitted, setSubmitted] = useState(false);
	const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

	const result = schema.safeParse(values);
	const errors: Record<string, string> = {
		...(submitted && !result.success ? formErrors(result.error) : {}),
		...serverErrors,
	};

	function set<K extends keyof z.input<S>>(key: K, value: z.input<S>[K]) {
		setValues((current) => ({ ...current, [key]: value }));
		setServerErrors((current) => {
			const { [key as string]: _cleared, ...rest } = current;
			return rest;
		});
	}

	/**
	 * Drops the API errors under `prefix` ("items" clears "items.0.expiry"...), or all of them. For fields edited
	 * without `set`, like the lines of a list: an index may now point at another line.
	 */
	function clearServerErrors(prefix?: string) {
		setServerErrors((current) =>
			prefix === undefined
				? {}
				: Object.fromEntries(
						Object.entries(current).filter(
							([key]) => key !== prefix && !key.startsWith(`${prefix}.`),
						),
					),
		);
	}

	/** Each submit starts without the API errors of the last one: the request answers again. */
	function handleSubmit(onValid: (data: z.output<S>) => void) {
		return () => {
			setSubmitted(true);
			clearServerErrors();
			if (result.success) onValid(result.data);
		};
	}

	/**
	 * Puts an API error that names a field (`details.field`) under that field. Returns `false` when the error isn't
	 * about a field of this form, so the screen shows it in the footer instead.
	 */
	function fieldOf(error: unknown): string | null {
		const field = isApiError(error) ? error.details.field : undefined;
		if (typeof field !== "string") return null;
		// "items.0.expiry" belongs to the `items` field of the form.
		const root = field.split(".")[0] ?? field;
		return root in values ? field : null;
	}

	function applyApiError(error: unknown) {
		const field = fieldOf(error);
		if (field) {
			setServerErrors((current) => ({
				...current,
				[field]: errorMessage(error),
			}));
		}
	}

	/** Back to the initial values, with no errors shown (a sheet opened again). */
	function reset() {
		setValues(initial);
		setSubmitted(false);
		setServerErrors({});
	}

	/** Message for the footer: a failed request that isn't about one field. */
	function footerError(error: unknown): string | null {
		if (!error || fieldOf(error)) return null;
		return errorMessage(error);
	}

	return {
		values,
		set,
		setValues,
		errors,
		clearServerErrors,
		handleSubmit,
		applyApiError,
		footerError,
		reset,
	};
}
