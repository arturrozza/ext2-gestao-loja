import { Elysia, t } from "elysia";
import { ErrorModel } from "../../lib/http-error";
import { authMacro } from "./auth.macro";
import { AuthModel } from "./auth.model";
import { AuthService } from "./auth.service";

export const authController = new Elysia({ prefix: "/auth" })
	.use(authMacro)
	.post("/sign-in", ({ body }) => AuthService.signIn(body), {
		body: AuthModel.signInBody,
		response: {
			200: AuthModel.signInResponse,
			401: ErrorModel,
			422: ErrorModel,
			429: ErrorModel,
		},
	})
	.get("/session", ({ session }) => AuthService.view(session), {
		auth: true,
		response: { 200: AuthModel.session, 401: ErrorModel },
	})
	.post(
		"/sign-out",
		async ({ session }) => {
			await AuthService.signOut(session);
			return null;
		},
		{ auth: true, response: { 200: t.Null(), 401: ErrorModel } },
	)
	.post(
		"/password",
		async ({ session, body }) => {
			await AuthService.changePassword(session, body);
			return null;
		},
		{
			auth: true,
			body: AuthModel.changePasswordBody,
			response: {
				200: t.Null(),
				400: ErrorModel,
				401: ErrorModel,
				422: ErrorModel,
				429: ErrorModel,
			},
		},
	);
