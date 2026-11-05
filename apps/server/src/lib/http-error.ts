import { status, t, type UnwrapSchema } from "elysia";

/**
 * Body of every error the API returns. `code` is stable (the app reacts to it), `message` is pt-BR and ready to show,
 * `field` names the input the error belongs to.
 */
export const ErrorModel = t.Object({
	code: t.String(),
	message: t.String(),
	field: t.Optional(t.String()),
});

export type ErrorBody = UnwrapSchema<typeof ErrorModel>;

type ErrorStatus = 400 | 401 | 404 | 409 | 422 | 429;

/** A domain error as an HTTP response. Services `throw` it; Elysia sends it with the status. */
export function httpError(code: ErrorStatus, body: ErrorBody) {
	return status(code, body);
}

export const unauthorized: ErrorBody = {
	code: "unauthorized",
	message: "Sua sessão expirou. Entre de novo.",
};

/** Postgres `unique_violation` (23505), wherever the driver or Drizzle put it in the error chain. */
export function isUniqueViolation(error: unknown): boolean {
	let current: unknown = error;
	while (current instanceof Error) {
		const { code, errno } = current as Error & {
			code?: unknown;
			errno?: unknown;
		};
		if (code === "23505" || errno === "23505") return true;
		current = current.cause;
	}
	return false;
}

/** `/email` → `email`: the field the app puts the message under. */
export function invalidField(path: string | undefined): string | undefined {
	return path?.replace(/^\//, "").split("/")[0] || undefined;
}

export const validationError = (field: string | undefined): ErrorBody => ({
	code: "validation",
	message: "Confira os dados enviados.",
	field,
});

/**
 * Anything unexpected. Never the original message: a Drizzle error carries the SQL and its parameters (password
 * hashes, e-mails). The details go to the server log only.
 */
export const internalError: ErrorBody = {
	code: "internal",
	message: "Algo deu errado. Tente de novo.",
};

/**
 * What goes to the log for an unexpected error. A Drizzle query error's message carries the SQL and its parameters
 * (password hashes, e-mails), so only its cause (the database's own error) is logged.
 */
export function loggable(error: unknown): unknown {
	if (error instanceof Error && error.name === "DrizzleQueryError") {
		return error.cause;
	}
	return error;
}
