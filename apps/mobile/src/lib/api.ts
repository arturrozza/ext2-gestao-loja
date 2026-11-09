import { treaty } from "@elysia/eden";
import type { App, ErrorBody } from "@ext2/server";
import { File, type UploadResult, UploadType } from "expo-file-system";
import { ApiError } from "./api-error";
import { env } from "./env";
import { sessionToken } from "./session-token";

/** A request that hangs (wrong address, captive Wi-Fi) fails as `network` after this, instead of the OS timeout. */
const TIMEOUT_MS = 15_000;

function timeoutSignal(ms = TIMEOUT_MS): AbortSignal {
	const controller = new AbortController();
	setTimeout(() => controller.abort(), ms);
	return controller.signal;
}

/** Every request carries the session as `Authorization: Bearer <token>` (RFC 6750) once there is one. */
function authHeaders(): Record<string, string> | undefined {
	const token = sessionToken.current();
	return token ? { authorization: `Bearer ${token}` } : undefined;
}

export const api = treaty<App>(env.EXPO_PUBLIC_API_URL, {
	// Eden turns any date-looking string into a `Date` by default, against the types: days ("2026-11-09"), expiry
	// months and timestamps arrive as the strings the API sends (docs/stack.md, "Restrições conhecidas").
	parseDate: false,
	headers: authHeaders,
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

/** What the server answered, parsed when it's JSON (an `ErrorModel` on failure). */
function parseBody(body: string): unknown {
	try {
		return JSON.parse(body);
	} catch {
		return body;
	}
}

/** Sending a photo on a weak connection takes longer than an ordinary request. */
const UPLOAD_TIMEOUT_MS = 60_000;

/**
 * Sends a local file (a `file://` URI) to an API route as multipart, with the session, throwing the same `ApiError`s as
 * `request()`. The one call outside Eden: Eden only sends a file that is a `Blob`, and an Expo file isn't one. So the
 * route, the field and the answer aren't checked by the compiler: `read` turns the answer into `T`, or returns `null`
 * when it isn't one (a captive portal's page, say), which fails the call instead of passing on something else.
 */
export async function uploadFile<T>(
	path: string,
	uri: string,
	options: {
		fieldName: string;
		mimeType: string;
		read: (value: unknown) => T | null;
	},
): Promise<T> {
	const file = new File(uri);
	if (!file.exists) {
		throw new ApiError(
			"local_file_missing",
			"Não foi possível ler a foto. Escolha a foto de novo.",
		);
	}
	let result: UploadResult;
	try {
		const base = env.EXPO_PUBLIC_API_URL.replace(/\/+$/, "");
		result = await file.upload(`${base}${path}`, {
			httpMethod: "POST",
			uploadType: UploadType.MULTIPART,
			fieldName: options.fieldName,
			mimeType: options.mimeType,
			headers: authHeaders(),
			// iOS defaults to a background session, which can outlive this promise; the form waits for the answer.
			sessionType: "foreground",
			signal: timeoutSignal(UPLOAD_TIMEOUT_MS),
		});
	} catch {
		// The file was there: what's left is the connection (or the timeout).
		throw networkError();
	}
	const value = parseBody(result.body);
	if (result.status < 200 || result.status >= 300) {
		throw toApiError({ status: result.status, value });
	}
	const answer = options.read(value);
	if (answer === null) throw toApiError({ status: result.status, value });
	return answer;
}
