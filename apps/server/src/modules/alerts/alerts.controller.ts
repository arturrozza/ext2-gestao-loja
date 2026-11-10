import { Elysia } from "elysia";
import { ErrorModel } from "../../lib/http-error";
import { authMacro } from "../auth/auth.macro";
import { AlertsModel } from "./alerts.model";
import { AlertsService } from "./alerts.service";

export const alertsController = new Elysia({ prefix: "/alerts" })
	.use(authMacro)
	.get("/", ({ session }) => AlertsService.counts(session.store.id), {
		auth: true,
		response: { 200: AlertsModel.counts, 401: ErrorModel },
	});
