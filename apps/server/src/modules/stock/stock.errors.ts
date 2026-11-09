import { httpError } from "../../lib/http-error";

/**
 * A write that would take a product's stock past what the ledger holds (R$ 21 million, or 2 billion units): 422 on
 * `field` when an input caused it (a purchase line, the new quantity or cost of an adjustment).
 */
export const stockLimit = (field?: string) =>
	httpError(422, {
		code: "stock_limit",
		message: "O estoque desse produto passaria do limite que o sistema guarda.",
		...(field ? { field } : {}),
	});
