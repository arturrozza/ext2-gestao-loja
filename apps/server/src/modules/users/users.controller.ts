import { Elysia } from "elysia";
import { ErrorModel } from "../../lib/http-error";
import { authMacro } from "../auth/auth.macro";
import { UsersModel } from "./users.model";
import { UsersService } from "./users.service";

export const usersController = new Elysia({ prefix: "/users" })
	.use(authMacro)
	.get("/", ({ session }) => UsersService.list(session.store.id), {
		auth: true,
		response: { 200: UsersModel.list, 401: ErrorModel },
	})
	.post("/", ({ session, body }) => UsersService.create(session, body), {
		auth: true,
		body: UsersModel.createBody,
		response: {
			200: UsersModel.user,
			401: ErrorModel,
			409: ErrorModel,
			422: ErrorModel,
		},
	})
	.post(
		"/:id/deactivate",
		({ session, params }) => UsersService.deactivate(session, params.id),
		{
			auth: true,
			params: UsersModel.params,
			response: {
				200: UsersModel.user,
				400: ErrorModel,
				401: ErrorModel,
				404: ErrorModel,
				422: ErrorModel,
			},
		},
	)
	.post(
		"/:id/reactivate",
		({ session, params }) => UsersService.reactivate(session, params.id),
		{
			auth: true,
			params: UsersModel.params,
			response: {
				200: UsersModel.user,
				401: ErrorModel,
				404: ErrorModel,
				422: ErrorModel,
			},
		},
	);
