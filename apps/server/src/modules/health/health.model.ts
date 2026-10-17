import { t, type UnwrapSchema } from "elysia";

export const HealthModel = {
	status: t.Object({
		status: t.Literal("ok"),
		database: t.Union([t.Literal("up"), t.Literal("down")]),
	}),
};

export type HealthModel = {
	status: UnwrapSchema<typeof HealthModel.status>;
};
