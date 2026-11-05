import { ApiError } from "@/lib/api-error";

/**
 * The request of a module that has no API yet (docs/decisions.md, "Em construção"). Its screens show "Em construção"
 * and aren't reachable, so this doesn't run in practice; if it does, it fails like any request. `T` keeps the hook's
 * data typed for the screens that will use it; the arguments are what the real request will send.
 */
export function underConstruction<T>(..._request: unknown[]): Promise<T> {
	return Promise.reject(
		new ApiError("under_construction", "Esta parte do app está em construção."),
	);
}
