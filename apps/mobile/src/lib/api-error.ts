/** A business-rule or network failure. `message` is pt-BR, ready to show; `details.field` names the field. */
export class ApiError extends Error {
	readonly code: string;
	readonly details: Record<string, unknown>;

	constructor(
		code: string,
		message: string,
		details: Record<string, unknown> = {},
	) {
		super(message);
		this.name = "ApiError";
		this.code = code;
		this.details = details;
	}
}

export function isApiError(error: unknown, code?: string): error is ApiError {
	return (
		error instanceof ApiError && (code === undefined || error.code === code)
	);
}
