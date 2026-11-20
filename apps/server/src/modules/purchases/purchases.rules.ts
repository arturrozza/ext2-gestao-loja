import { dayProblem, type ExpiryMonth, type ISODate } from "../../lib/dates";
import { httpError } from "../../lib/http-error";
import { previewOf } from "../../lib/preview";
import { blankToNull } from "../../lib/text";
import type { LockedProduct } from "../products/products.lock";
import type { PurchasesModel } from "./purchases.model";

type ItemInput = PurchasesModel["body"]["items"][number];

const invalid = (field: string, message: string, code = "validation") =>
	httpError(422, { code, message, field });

/** The day of a purchase can be any day up to today (the store's day). */
export function assertPurchaseDate(date: ISODate, today: ISODate): void {
	const problem = dayProblem(date, today);
	if (problem === "future") {
		throw invalid("date", "A data da compra não pode ser no futuro.");
	}
	if (problem) throw invalid("date", "Confira a data da compra.");
}

/** Only an active product of the store goes into a purchase (produtos.md). */
function assertProduct(
	field: string,
	product: LockedProduct | undefined,
): asserts product is LockedProduct {
	if (!product) {
		throw invalid(field, "Produto não encontrado.", "product_not_found");
	}
	if (product.archived) {
		throw invalid(
			field,
			`${product.name} está arquivado. Reative ele para comprar.`,
			"product_archived",
		);
	}
}

/**
 * The expiry follows the product: required when it "tem validade", refused when it hasn't, and never a month already
 * gone (those units would come in expired).
 */
function expiryProblem(
	expiry: ExpiryMonth | null,
	hasExpiry: boolean,
	currentMonth: ExpiryMonth,
): string | null {
	if (hasExpiry && !expiry) return "Informe a validade.";
	if (!hasExpiry && expiry) return "Esse produto não tem validade.";
	if (expiry && expiry < currentMonth) return "Essa validade já passou.";
	return null;
}

/**
 * The lot number and the manufacture month of a line (compras.md, RN-COM-15 and RN-COM-16): the number only on a
 * product with expiry, the month never in the future. An expiry is never a month already gone, so a manufacture month
 * that isn't in the future can't be after it either.
 */
function lotProblem(
	item: ItemInput,
	hasExpiry: boolean,
	currentMonth: ExpiryMonth,
): { field: string; message: string } | null {
	if (!hasExpiry && blankToNull(item.lotCode ?? null)) {
		return {
			field: "lotCode",
			message: "Só produto com validade tem número de lote.",
		};
	}
	if (item.manufacturedOn && item.manufacturedOn > currentMonth) {
		return {
			field: "manufacturedOn",
			message: "A fabricação não pode ser de um mês futuro.",
		};
	}
	return null;
}

/** Every line against its product (locked by the caller): the first problem answers 422 on that line's field. */
export function assertItems(
	items: ItemInput[],
	productsById: Map<string, LockedProduct>,
	currentMonth: ExpiryMonth,
): void {
	items.forEach((item, index) => {
		const product = productsById.get(item.productId);
		assertProduct(`items.${index}.productId`, product);
		const problem = expiryProblem(item.expiry, product.hasExpiry, currentMonth);
		if (problem) throw invalid(`items.${index}.expiry`, problem);
		const lot = lotProblem(item, product.hasExpiry, currentMonth);
		if (lot) throw invalid(`items.${index}.${lot.field}`, lot.message);
	});
}

type SummaryLine = Pick<
	PurchasesModel["item"],
	"productId" | "productName" | "photoUrl" | "quantity" | "total"
>;

/** Counts and total of a purchase, and the first products for its thumbs. */
export function summarizeLines(
	lines: SummaryLine[],
): Pick<
	PurchasesModel["summary"],
	"itemCount" | "unitCount" | "total" | "productCount" | "preview"
> {
	return {
		itemCount: lines.length,
		unitCount: lines.reduce((sum, line) => sum + line.quantity, 0),
		total: lines.reduce((sum, line) => sum + line.total, 0),
		...previewOf(lines),
	};
}

/** A purchase is canceled once (compras.md, "Cancelamento"). */
export const alreadyCanceled = () =>
	httpError(409, {
		code: "purchase_already_canceled",
		message: "Essa compra já foi cancelada.",
	});

/**
 * A purchase with a unit already sold, adjusted or discarded can't be canceled: that unit already moved value at the
 * average cost, so the correction goes through an adjustment or "Corrigir custo" (compras.md). A canceled sale gives
 * its units back, which unblocks it again.
 */
export const unitsGone = () =>
	httpError(409, {
		code: "purchase_units_gone",
		message:
			'Não dá para cancelar: unidades desta compra já saíram do estoque. Corrija pelo ajuste ou por "Corrigir custo".',
	});
