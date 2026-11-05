/**
 * Error the API returns for a business rule (insufficient stock, duplicate code...) or a network failure. `code` lets
 * screens react to a specific rule (e.g. offer "Lançar compra" on `insufficient_stock`); `message` is pt-BR, ready to
 * show; `details` carries extra data such as the field the error belongs to.
 */
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
