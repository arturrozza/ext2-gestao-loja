import { Elysia } from "elysia";
import { ErrorModel } from "../../lib/http-error";
import { authMacro } from "../auth/auth.macro";
import { SalesModel } from "./sales.model";
import { SalesService } from "./sales.service";

export const salesController = new Elysia({ prefix: "/sales" })
	.use(authMacro)
	.get(
		"/",
		({ session, query }) => SalesService.list(session.store.id, query),
		{
			auth: true,
			query: SalesModel.listQuery,
			response: { 200: SalesModel.page, 401: ErrorModel, 422: ErrorModel },
		},
	)
	.post("/", ({ session, body }) => SalesService.create(session, body), {
		auth: true,
		body: SalesModel.body,
		response: {
			200: SalesModel.detail,
			401: ErrorModel,
			422: ErrorModel,
		},
	})
	.get(
		"/:id",
		({ session, params }) => SalesService.get(session.store.id, params.id),
		{
			auth: true,
			params: SalesModel.params,
			response: {
				200: SalesModel.detail,
				401: ErrorModel,
				404: ErrorModel,
				422: ErrorModel,
			},
		},
	)
	.post(
		"/:id/cancel",
		({ session, params, body }) =>
			SalesService.cancel(session, params.id, body),
		{
			auth: true,
			params: SalesModel.params,
			body: SalesModel.cancelBody,
			response: {
				200: SalesModel.detail,
				401: ErrorModel,
				404: ErrorModel,
				409: ErrorModel,
				422: ErrorModel,
			},
		},
	);
