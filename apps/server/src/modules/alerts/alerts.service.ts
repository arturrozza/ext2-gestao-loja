import { and, eq, isNull, type SQL, sql } from "drizzle-orm";
import { db } from "../../db";
import { products } from "../../db/schema";
import { type ISODate, storeToday } from "../../lib/dates";
import { stockStateFilter } from "../stock/stock.queries";
import type { AlertsModel } from "./alerts.model";

const countWhere = (condition: SQL) =>
	sql`count(*) filter (where ${condition})`.mapWith(Number);

/**
 * Alerts (alertas.md) are computed from the data, so they vanish once the problem is solved. They're the product list's
 * stock filters, counted over the active products (an archived one never alerts): the numbers always match the list.
 */
export const AlertsService = {
	async counts(
		storeId: string,
		today: ISODate = storeToday(),
	): Promise<AlertsModel["counts"]> {
		const [row] = await db
			.select({
				lowStock: countWhere(stockStateFilter("low", today)),
				outOfStock: countWhere(stockStateFilter("out", today)),
				nearExpiry: countWhere(stockStateFilter("near_expiry", today)),
				expired: countWhere(stockStateFilter("expired", today)),
			})
			.from(products)
			.where(and(eq(products.storeId, storeId), isNull(products.archivedAt)));
		// An aggregate without `group by` always gives one row.
		if (!row) throw new Error("alerts aggregate returned no row");
		return row;
	},
};
