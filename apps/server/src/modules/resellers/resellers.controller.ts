import { Elysia } from "elysia";
import { ErrorModel } from "../../lib/http-error";
import { authMacro } from "../auth/auth.macro";
import { ResellersModel } from "./resellers.model";
import { ResellersService } from "./resellers.service";

const byId = {
	200: ResellersModel.reseller,
	401: ErrorModel,
	404: ErrorModel,
	422: ErrorModel,
};

export const resellersController = new Elysia({ prefix: "/resellers" })
	.use(authMacro)
	.get(
		"/",
		({ session, query }) => ResellersService.list(session.store.id, query),
		{
			auth: true,
			query: ResellersModel.listQuery,
			response: { 200: ResellersModel.list, 401: ErrorModel, 422: ErrorModel },
		},
	)
	.post("/", ({ session, body }) => ResellersService.create(session, body), {
		auth: true,
		body: ResellersModel.body,
		response: {
			200: ResellersModel.reseller,
			401: ErrorModel,
			422: ErrorModel,
		},
	})
	.get(
		"/:id",
		({ session, params }) => ResellersService.get(session.store.id, params.id),
		{ auth: true, params: ResellersModel.params, response: byId },
	)
	.put(
		"/:id",
		({ session, params, body }) =>
			ResellersService.update(session, params.id, body),
		{
			auth: true,
			params: ResellersModel.params,
			body: ResellersModel.body,
			response: { ...byId, 409: ErrorModel },
		},
	)
	.post(
		"/:id/archive",
		({ session, params }) =>
			ResellersService.setArchived(session, params.id, true),
		{ auth: true, params: ResellersModel.params, response: byId },
	)
	.post(
		"/:id/reactivate",
		({ session, params }) =>
			ResellersService.setArchived(session, params.id, false),
		{ auth: true, params: ResellersModel.params, response: byId },
	);
