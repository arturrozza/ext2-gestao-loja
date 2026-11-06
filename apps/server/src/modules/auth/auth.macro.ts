import { Elysia, status } from "elysia";
import { unauthorized } from "../../lib/http-error";
import { AuthService } from "./auth.service";

/**
 * `auth: true` on a route requires a valid session and puts it in the context as `session`. Without one the route
 * answers 401 with `WWW-Authenticate: Bearer` (RFC 6750) and never runs.
 */
const CHALLENGE = 'Bearer realm="ext2"';

export const authMacro = new Elysia({ name: "auth.macro" }).macro({
	auth: {
		async resolve({ headers, set }) {
			const session = await AuthService.authenticate(headers.authorization);
			if (!session) {
				set.headers["www-authenticate"] = CHALLENGE;
				return status(401, unauthorized);
			}
			return { session };
		},
	},
});

/**
 * For a route that takes a big body (a photo): `auth` resolves only after Elysia has read and validated the body, so a
 * request with no token at all gets the same 401 before that, when it arrives. A token that turns out invalid still
 * gets its 401 from `auth`, after the body (bounded by the server's body limit, `src/index.ts`).
 */
export function tokenBeforeBody(method: string, path: string) {
	return new Elysia({
		name: `auth.token-before-body:${method} ${path}`,
	}).onRequest(({ request, set }) => {
		if (request.method !== method || request.headers.has("authorization")) {
			return;
		}
		if (new URL(request.url).pathname !== path) return;
		set.headers["www-authenticate"] = CHALLENGE;
		return status(401, unauthorized);
	});
}
