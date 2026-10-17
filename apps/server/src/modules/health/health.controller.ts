import { Elysia } from "elysia";
import { HealthModel } from "./health.model";
import { HealthService } from "./health.service";

export const healthController = new Elysia({ prefix: "/health" }).get(
	"/",
	() => HealthService.check(),
	{
		response: HealthModel.status,
	},
);
