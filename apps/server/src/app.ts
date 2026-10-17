import { Elysia } from "elysia";
import { healthController } from "./modules/health/health.controller";

export const app = new Elysia().use(healthController);

export type App = typeof app;
