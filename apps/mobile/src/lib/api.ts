import { treaty } from "@elysia/eden";
import type { App, ErrorBody } from "@ext2/server";
import { ApiError } from "./api-error";
import { env } from "./env";
import { sessionToken } from "./session-token";

/** A request that hangs (wrong address, captive Wi-Fi) fails as `network` after this, instead of the OS timeout. */
const TIMEOUT_MS = 15_000;

function timeoutSignal(): AbortSignal {
	const controller = new AbortController();
	setTimeout(() => controller.abort(), TIMEOUT_MS);
	return controller.signal;
}

/** Every request carries the session as `Authorization: Bearer <token>` (RFC 6750) once there is one. */
export const api = treaty<App>(env.EXPO_PUBLIC_API_URL, {
	headers() {
		const token = sessionToken.current();
		return token ? { authorization: `Bearer ${token}` } : undefined;
	},
	onRequest: () => ({ signal: timeoutSignal() }),
});

function networkError() {
	return new ApiError(
		"network",
		"Não foi possível falar com o servidor. Confira a internet e tente de novo.",
	);
}

/** The API's error body (`ErrorModel`); anything else (a proxy page, a crash) isn't one. */
function isErrorBody(value: unknown): value is ErrorBody {
	if (typeof value !== "object" || value === null) return false;
	const { code, message } = value as Record<string, unknown>;
	return typeof code === "string" && typeof message === "string";
}

function toApiError(error: { status: unknown; value: unknown }): ApiError {
	if (!isErrorBody(error.value)) {
		return new ApiError(
			`http_${String(error.status)}`,
			"Algo deu errado. Tente de novo.",
		);
	}
	const { code, message, field } = error.value;
	return new ApiError(code, message, field ? { field } : {});
}

type EdenResult<T> = {
	data: T | null;
	error: { status: unknown; value: unknown } | null;
};

/**
 * Runs an Eden call and returns its data, throwing an `ApiError` on failure (what screens and the query client expect:
 * `unauthorized` ends the session, `network` is retried). Hooks wrap every `api` call with it.
 */
export async function request<T>(call: Promise<EdenResult<T>>): Promise<T> {
	let result: EdenResult<T>;
	try {
		result = await call;
	} catch {
		throw networkError();
	}
	if (result.error) throw toApiError(result.error);
	// Without an error Eden always has the data (it's `null` only for a body-less success, which T then allows).
	return result.data as T;
}
