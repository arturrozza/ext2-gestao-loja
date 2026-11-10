import { Elysia } from "elysia";
import { ErrorModel } from "../../lib/http-error";
import { authMacro } from "../auth/auth.macro";
import { ReportsModel } from "./reports.model";
import { ReportsService } from "./reports.service";

export const reportsController = new Elysia({ prefix: "/reports" })
	.use(authMacro)
	.get(
		"/",
		({ session, query }) => ReportsService.report(session.store.id, query),
		{
			auth: true,
			query: ReportsModel.query,
			response: { 200: ReportsModel.report, 401: ErrorModel, 422: ErrorModel },
		},
	);
