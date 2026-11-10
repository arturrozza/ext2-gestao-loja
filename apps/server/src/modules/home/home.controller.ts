import { Elysia } from "elysia";
import { ErrorModel } from "../../lib/http-error";
import { authMacro } from "../auth/auth.macro";
import { HomeModel } from "./home.model";
import { HomeService } from "./home.service";

export const homeController = new Elysia({ prefix: "/home" })
	.use(authMacro)
	.get("/", ({ session }) => HomeService.summary(session.store.id), {
		auth: true,
		response: { 200: HomeModel.summary, 401: ErrorModel },
	});
