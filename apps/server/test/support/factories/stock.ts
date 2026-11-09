import { eq } from "drizzle-orm";
import { audited } from "../../../src/db/audit";
import { stockLots, stores } from "../../../src/db/schema";
import {
	type ExpiryMonth,
	expiryToDate,
	monthOf,
	storeToday,
} from "../../../src/lib/dates";

/** The expiry month `months` from the store's this month ("2026-11" now, "2027-11" for 12). */
export function monthFrom(months: number): ExpiryMonth {
	const [year = 0, month = 0] = monthOf(storeToday()).split("-").map(Number);
	return new Date(Date.UTC(year, month - 1 + months, 1))
		.toISOString()
		.slice(0, 7);
}

/** Moves every lot of a product to `expiry`, to have expired units (a purchase never takes them). */
export async function setLotsExpiry(productId: string, expiry: ExpiryMonth) {
	await audited("system", (tx) =>
		tx
			.update(stockLots)
			.set({ expiry: expiryToDate(expiry) })
			.where(eq(stockLots.productId, productId)),
	);
}

/** Changes the store's "antecedência de vencimento" (alertas.md). */
export async function setExpiryWarningDays(storeId: string, days: number) {
	await audited("system", (tx) =>
		tx
			.update(stores)
			.set({ expiryWarningDays: days })
			.where(eq(stores.id, storeId)),
	);
}
