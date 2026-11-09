import { storeToday } from "../../../src/lib/dates";
import type { AuthSession } from "../../../src/modules/auth/auth.model";
import type { PurchasesModel } from "../../../src/modules/purchases/purchases.model";
import { PurchasesService } from "../../../src/modules/purchases/purchases.service";

type ItemBody = PurchasesModel["body"]["items"][number];

/** A purchase line: 1 unit at R$ 10 without expiry; override any field. */
export function purchaseItem(
	productId: string,
	overrides: Partial<Omit<ItemBody, "productId">> = {},
): ItemBody {
	return { productId, quantity: 1, unitCost: 1000, expiry: null, ...overrides };
}

/** A valid purchase body, dated today, with these lines. */
export function purchaseBody(
	items: ItemBody[],
	overrides: Partial<Omit<PurchasesModel["body"], "items">> = {},
): PurchasesModel["body"] {
	return { date: storeToday(), note: null, items, ...overrides };
}

/** Enters a purchase through the service, like the app does. */
export function createPurchase(session: AuthSession, items: ItemBody[]) {
	return PurchasesService.create(session, purchaseBody(items));
}

/** A day relative to the store's today ("2026-11-10" for `days = 1`). */
export function storeDayFrom(days: number): string {
	return storeToday(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
}
