import { Elysia } from "elysia";
import { ErrorModel } from "../../lib/http-error";
import { authMacro } from "../auth/auth.macro";
import { CustomersModel } from "./customers.model";
import { CustomersService } from "./customers.service";

const byId = {
	200: CustomersModel.customer,
	401: ErrorModel,
	404: ErrorModel,
	422: ErrorModel,
};

export const customersController = new Elysia({ prefix: "/customers" })
	.use(authMacro)
	.get(
		"/",
		({ session, query }) => CustomersService.list(session.store.id, query),
		{
			auth: true,
			query: CustomersModel.listQuery,
			response: { 200: CustomersModel.page, 401: ErrorModel, 422: ErrorModel },
		},
	)
	.post("/", ({ session, body }) => CustomersService.create(session, body), {
		auth: true,
		body: CustomersModel.body,
		response: {
			200: CustomersModel.customer,
			401: ErrorModel,
			422: ErrorModel,
		},
	})
	.get(
		"/:id",
		({ session, params }) => CustomersService.get(session.store.id, params.id),
		{ auth: true, params: CustomersModel.params, response: byId },
	)
	.put(
		"/:id",
		({ session, params, body }) =>
			CustomersService.update(session, params.id, body),
		{
			auth: true,
			params: CustomersModel.params,
			body: CustomersModel.body,
			response: { ...byId, 409: ErrorModel },
		},
	)
	.post(
		"/:id/archive",
		({ session, params }) =>
			CustomersService.setArchived(session, params.id, true),
		{ auth: true, params: CustomersModel.params, response: byId },
	)
	.post(
		"/:id/reactivate",
		({ session, params }) =>
			CustomersService.setArchived(session, params.id, false),
		{ auth: true, params: CustomersModel.params, response: byId },
	);
