import { Elysia } from "elysia";
import { ErrorModel } from "../../lib/http-error";
import { authMacro, tokenBeforeBody } from "../auth/auth.macro";
import { ProductsModel } from "./products.model";
import { ProductsService } from "./products.service";
import { ProductStockService } from "./products.stock";

const byId = {
	200: ProductsModel.productDetail,
	401: ErrorModel,
	404: ErrorModel,
	422: ErrorModel,
};

export const productsController = new Elysia({ prefix: "/products" })
	.use(authMacro)
	.use(tokenBeforeBody("POST", "/products/photos"))
	.get(
		"/",
		({ session, query }) => ProductsService.list(session.store.id, query),
		{
			auth: true,
			query: ProductsModel.listQuery,
			response: { 200: ProductsModel.page, 401: ErrorModel, 422: ErrorModel },
		},
	)
	.get(
		"/stock-value",
		({ session }) => ProductStockService.storeValue(session.store.id),
		{
			auth: true,
			response: { 200: ProductsModel.stockValue, 401: ErrorModel },
		},
	)
	.post("/", ({ session, body }) => ProductsService.create(session, body), {
		auth: true,
		body: ProductsModel.body,
		response: {
			200: ProductsModel.productDetail,
			401: ErrorModel,
			409: ErrorModel,
			422: ErrorModel,
			503: ErrorModel,
		},
	})
	.post(
		"/photos",
		({ session, body }) => ProductsService.uploadPhoto(session, body.photo),
		{
			auth: true,
			body: ProductsModel.photoUpload,
			response: {
				200: ProductsModel.uploadedPhoto,
				401: ErrorModel,
				422: ErrorModel,
				503: ErrorModel,
			},
		},
	)
	.get(
		"/:id",
		({ session, params }) => ProductsService.get(session.store.id, params.id),
		{ auth: true, params: ProductsModel.params, response: byId },
	)
	.get(
		"/:id/movements",
		({ session, params, query }) =>
			ProductStockService.movements(session.store.id, params.id, query.cursor),
		{
			auth: true,
			params: ProductsModel.params,
			query: ProductsModel.movementsQuery,
			response: {
				200: ProductsModel.movementsPage,
				401: ErrorModel,
				404: ErrorModel,
				422: ErrorModel,
			},
		},
	)
	.post(
		"/:id/adjustments",
		({ session, params, body }) =>
			ProductStockService.adjust(session, params.id, body),
		{
			auth: true,
			params: ProductsModel.params,
			body: ProductsModel.adjustmentBody,
			response: byId,
		},
	)
	.post(
		"/:id/cost-corrections",
		({ session, params, body }) =>
			ProductStockService.correctCost(session, params.id, body),
		{
			auth: true,
			params: ProductsModel.params,
			body: ProductsModel.costCorrectionBody,
			response: byId,
		},
	)
	.put(
		"/:id",
		({ session, params, body }) =>
			ProductsService.update(session, params.id, body),
		{
			auth: true,
			params: ProductsModel.params,
			body: ProductsModel.body,
			response: { ...byId, 409: ErrorModel, 503: ErrorModel },
		},
	)
	.post(
		"/:id/archive",
		({ session, params }) =>
			ProductsService.setArchived(session, params.id, true),
		{ auth: true, params: ProductsModel.params, response: byId },
	)
	.post(
		"/:id/reactivate",
		({ session, params }) =>
			ProductsService.setArchived(session, params.id, false),
		{ auth: true, params: ProductsModel.params, response: byId },
	);
