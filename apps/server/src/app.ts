import { Elysia } from "elysia";
import {
	type ErrorBody,
	internalError,
	invalidField,
	loggable,
	validationError,
} from "./lib/http-error";
import { authController } from "./modules/auth/auth.controller";
import { categoriesController } from "./modules/categories/categories.controller";
import { healthController } from "./modules/health/health.controller";
import { productsController } from "./modules/products/products.controller";
import { storeController } from "./modules/store/store.controller";
import { usersController } from "./modules/users/users.controller";

export type { ErrorBody } from "./lib/http-error";

export const app = new Elysia()
	// Every error leaves with the same body as domain errors (`ErrorModel`), so the app handles them one way.
	.onError({ as: "global" }, ({ code, error, set }) => {
		// A domain error (`httpError`) already has its status and body.
		if (typeof code === "number") return;
		if (code === "VALIDATION" && error.type !== "response") {
			set.status = 422;
			return validationError(invalidField(error.valueError?.path));
		}
		if (code === "PARSE") {
			set.status = 400;
			return {
				code: "invalid_body",
				message: "Confira os dados enviados.",
			} satisfies ErrorBody;
		}
		if (code === "NOT_FOUND") {
			set.status = 404;
			return {
				code: "not_found",
				message: "Rota não encontrada.",
			} satisfies ErrorBody;
		}
		// Anything else, a response that broke its own schema included, is the server's fault.
		console.error("[api] unexpected error", loggable(error));
		set.status = 500;
		return internalError;
	})
	.use(healthController)
	.use(authController)
	.use(usersController)
	.use(storeController)
	.use(categoriesController)
	.use(productsController);

export type App = typeof app;
