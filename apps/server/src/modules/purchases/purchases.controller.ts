import { Elysia } from "elysia";
import { ErrorModel } from "../../lib/http-error";
import { authMacro } from "../auth/auth.macro";
import { PurchasesModel } from "./purchases.model";
import { PurchasesService } from "./purchases.service";

export const purchasesController = new Elysia({ prefix: "/purchases" })
	.use(authMacro)
	.get(
		"/",
		({ session, query }) => PurchasesService.list(session.store.id, query),
		{
			auth: true,
			query: PurchasesModel.listQuery,
			response: { 200: PurchasesModel.page, 401: ErrorModel, 422: ErrorModel },
		},
	)
	.post("/", ({ session, body }) => PurchasesService.create(session, body), {
		auth: true,
		body: PurchasesModel.body,
		response: {
			200: PurchasesModel.detail,
			401: ErrorModel,
			422: ErrorModel,
		},
	})
	.get(
		"/:id",
		({ session, params }) => PurchasesService.get(session.store.id, params.id),
		{
			auth: true,
			params: PurchasesModel.params,
			response: {
				200: PurchasesModel.detail,
				401: ErrorModel,
				404: ErrorModel,
				422: ErrorModel,
			},
		},
	)
	.post(
		"/:id/cancel",
		({ session, params, body }) =>
			PurchasesService.cancel(session, params.id, body),
		{
			auth: true,
			params: PurchasesModel.params,
			body: PurchasesModel.cancelBody,
			response: {
				200: PurchasesModel.detail,
				401: ErrorModel,
				404: ErrorModel,
				409: ErrorModel,
				422: ErrorModel,
			},
		},
	);
