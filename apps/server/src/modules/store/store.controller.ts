import { Elysia } from "elysia";
import { ErrorModel } from "../../lib/http-error";
import { authMacro } from "../auth/auth.macro";
import { StoreModel } from "./store.model";
import { StoreService } from "./store.service";

export const storeController = new Elysia({ prefix: "/store" })
	.use(authMacro)
	.get("/", ({ session }) => StoreService.profile(session.store.id), {
		auth: true,
		response: { 200: StoreModel.profile, 401: ErrorModel },
	})
	.put(
		"/",
		({ session, body }) => StoreService.updateProfile(session.store.id, body),
		{
			auth: true,
			body: StoreModel.profile,
			response: { 200: StoreModel.profile, 401: ErrorModel, 422: ErrorModel },
		},
	)
	.get("/settings", ({ session }) => StoreService.settings(session.store.id), {
		auth: true,
		response: { 200: StoreModel.settings, 401: ErrorModel },
	})
	.put(
		"/settings",
		({ session, body }) => StoreService.updateSettings(session.store.id, body),
		{
			auth: true,
			body: StoreModel.settings,
			response: { 200: StoreModel.settings, 401: ErrorModel, 422: ErrorModel },
		},
	);
