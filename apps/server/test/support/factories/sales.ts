import { storeToday } from "../../../src/lib/dates";
import type { AuthSession } from "../../../src/modules/auth/auth.model";
import type { SalesModel } from "../../../src/modules/sales/sales.model";
import { SalesService } from "../../../src/modules/sales/sales.service";
import { createProduct } from "./catalog";
import { createPurchase, purchaseItem } from "./purchases";

type Body = SalesModel["body"];
type ItemBody = Body["items"][number];

/** A sale line: 1 unit at R$ 100; override any field. */
export function saleItem(
	productId: string,
	overrides: Partial<Omit<ItemBody, "productId">> = {},
): ItemBody {
	return { productId, quantity: 1, unitPrice: 10_000, ...overrides };
}

/** A valid sale body at the store, dated today, paid in Pix, with these lines and no costs. */
export function saleBody(
	items: ItemBody[],
	overrides: Partial<Omit<Body, "items">> = {},
): Body {
	return {
		date: storeToday(),
		channel: "store",
		resellerId: null,
		customerId: null,
		items,
		discount: 0,
		surcharge: 0,
		costs: [],
		paymentCondition: "cash",
		paymentMethod: "pix",
		...overrides,
	};
}

/** Enters a sale through the service, like the app does. */
export function createSale(
	session: AuthSession,
	items: ItemBody[],
	overrides: Partial<Omit<Body, "items">> = {},
) {
	return SalesService.create(session, saleBody(items, overrides));
}

/** Cancels a sale through the service, like the app does: it stays listed, out of every total. */
export function cancelSale(
	session: AuthSession,
	saleId: string,
	reason = "Lançada errada",
) {
	return SalesService.cancel(session, saleId, { reason });
}

/** A product of the session's store with `quantity` units bought at `unitCost`, ready to sell. */
export async function stockedProduct(
	session: AuthSession,
	quantity = 10,
	unitCost = 4000,
) {
	const product = await createProduct(session.store.id);
	await createPurchase(session, [
		purchaseItem(product.id, { quantity, unitCost }),
	]);
	return product;
}
