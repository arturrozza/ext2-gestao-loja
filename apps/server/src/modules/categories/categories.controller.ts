import { Elysia } from "elysia";
import { ErrorModel } from "../../lib/http-error";
import { authMacro } from "../auth/auth.macro";
import { CategoriesModel } from "./categories.model";
import { CategoriesService } from "./categories.service";

const write = {
	200: CategoriesModel.category,
	401: ErrorModel,
	409: ErrorModel,
	422: ErrorModel,
};

const archive = {
	200: CategoriesModel.category,
	401: ErrorModel,
	404: ErrorModel,
	422: ErrorModel,
};

export const categoriesController = new Elysia({ prefix: "/categories" })
	.use(authMacro)
	.get("/", ({ session }) => CategoriesService.list(session.store.id), {
		auth: true,
		response: { 200: CategoriesModel.list, 401: ErrorModel },
	})
	.post("/", ({ session, body }) => CategoriesService.create(session, body), {
		auth: true,
		body: CategoriesModel.body,
		response: write,
	})
	.put(
		"/:id",
		({ session, params, body }) =>
			CategoriesService.rename(session, params.id, body),
		{
			auth: true,
			params: CategoriesModel.params,
			body: CategoriesModel.body,
			response: { ...write, 404: ErrorModel },
		},
	)
	.post(
		"/:id/archive",
		({ session, params }) =>
			CategoriesService.setArchived(session, params.id, true),
		{ auth: true, params: CategoriesModel.params, response: archive },
	)
	.post(
		"/:id/reactivate",
		({ session, params }) =>
			CategoriesService.setArchived(session, params.id, false),
		{ auth: true, params: CategoriesModel.params, response: archive },
	);
