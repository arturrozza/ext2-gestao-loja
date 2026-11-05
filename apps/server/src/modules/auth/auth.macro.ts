import { Elysia, status } from "elysia";
import { unauthorized } from "../../lib/http-error";
import { AuthService } from "./auth.service";

/**
 * `auth: true` on a route requires a valid session and puts it in the context as `session`. Without one the route
 * answers 401 with `WWW-Authenticate: Bearer` (RFC 6750) and never runs.
 */
export const authMacro = new Elysia({ name: "auth.macro" }).macro({
	auth: {
		async resolve({ headers, set }) {
			const session = await AuthService.authenticate(headers.authorization);
			if (!session) {
				set.headers["www-authenticate"] = 'Bearer realm="ext2"';
				return status(401, unauthorized);
			}
			return { session };
		},
	},
});
