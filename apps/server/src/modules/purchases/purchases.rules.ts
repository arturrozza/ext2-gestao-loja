import { type ExpiryMonth, type ISODate, isRealDay } from "../../lib/dates";
import { httpError } from "../../lib/http-error";
import type { LockedProduct } from "../products/products.lock";
import { PREVIEW_SIZE, type PurchasesModel } from "./purchases.model";

type ItemInput = PurchasesModel["body"]["items"][number];

const invalid = (field: string, message: string, code = "validation") =>
	httpError(422, { code, message, field });

/** Earliest day a purchase takes: anything before is a typo (and the year 0 the date format lets through). */
const EARLIEST_DATE = "2000-01-01";

/** The day of a purchase can be any day up to today (the store's day). */
export function assertPurchaseDate(date: ISODate, today: ISODate): void {
	if (!isRealDay(date)) {
		throw invalid("date", "Confira a data da compra.");
	}
	if (date > today) {
		throw invalid("date", "A data da compra não pode ser no futuro.");
	}
	if (date < EARLIEST_DATE) {
		throw invalid("date", "Confira a data da compra.");
	}
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
	const previewById = new Map<string, PurchasesModel["preview"]>();
	for (const line of lines) {
		if (!previewById.has(line.productId)) {
			previewById.set(line.productId, {
				productId: line.productId,
				name: line.productName,
				photoUrl: line.photoUrl,
			});
		}
	}
	return {
		itemCount: lines.length,
		unitCount: lines.reduce((sum, line) => sum + line.quantity, 0),
		total: lines.reduce((sum, line) => sum + line.total, 0),
		productCount: previewById.size,
		preview: [...previewById.values()].slice(0, PREVIEW_SIZE),
	};
}
