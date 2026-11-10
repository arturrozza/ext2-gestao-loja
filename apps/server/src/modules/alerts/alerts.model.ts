import { t, type UnwrapSchema } from "elysia";

/** How many active products are in each alert (alertas.md); each matches the product list's stock filter. */
const counts = t.Object({
	lowStock: t.Integer({ minimum: 0 }),
	outOfStock: t.Integer({ minimum: 0 }),
	nearExpiry: t.Integer({ minimum: 0 }),
	expired: t.Integer({ minimum: 0 }),
});

export const AlertsModel = { counts };

export type AlertsModel = { counts: UnwrapSchema<typeof AlertsModel.counts> };
