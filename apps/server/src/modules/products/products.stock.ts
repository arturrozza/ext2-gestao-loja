import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "../../db";
import { audited, type Transaction } from "../../db/audit";
import {
	products,
	purchaseItems,
	purchases,
	saleItems,
	sales,
	stockMovements,
	users,
} from "../../db/schema";
import { storeToday } from "../../lib/dates";
import { PAGE_SIZE } from "../../lib/pagination";
import type { AuthSession } from "../auth/auth.model";
import { planAdjustment, planCostCorrection } from "../stock/stock.adjustment";
import { recordAdjustment, recordCostCorrection } from "../stock/stock.ledger";
import {
	openLots,
	stockBalances,
	storeStockValue,
} from "../stock/stock.queries";
import { EMPTY_STOCK } from "../stock/stock.rules";
import { lockProducts } from "./products.lock";
import type { ProductsModel } from "./products.model";
import { notFound } from "./products.rules";
import { ProductsService } from "./products.service";

/** A read with no lock still answers 404 for a product that isn't the store's (writes check it in `lockForStock`). */
async function assertProduct(storeId: string, id: string): Promise<void> {
	const [product] = await db
		.select({ id: products.id })
		.from(products)
		.where(and(eq(products.id, id), eq(products.storeId, storeId)));
	if (!product) throw notFound();
}

type Movement = ProductsModel["movementsPage"]["items"][number];

type Origin = { id: string; number: number } | null;

/** A ledger row as the history shows it: the purchase or sale it came from as its origin. */
function toMovement({
	seq: _seq,
	purchase,
	sale,
	createdAt,
	...row
}: Omit<Movement, "origin" | "createdAt"> & {
	seq: number;
	purchase: Origin;
	sale: Origin;
	createdAt: Date;
}): Movement {
	const origin =
		(purchase && { kind: "purchase" as const, ...purchase }) ??
		(sale && { kind: "sale" as const, ...sale });
	return { ...row, createdAt: createdAt.toISOString(), origin };
}

/** Locks the product for a stock write (products first, docs/decisions.md) and reads its balance under the lock. */
async function lockForStock(tx: Transaction, storeId: string, id: string) {
	const product = (await lockProducts(tx, storeId, [id])).get(id);
	if (!product) throw notFound();
	const balance =
		(await stockBalances(tx, storeId, [id])).get(id) ?? EMPTY_STOCK;
	return { product, balance };
}

const scopeOf = (session: AuthSession) => ({
	storeId: session.store.id,
	userId: session.user.id,
});

/** The stock of the store's products (docs/product/estoque.md): the ledger read back, and the store's total. */
export const ProductStockService = {
	/**
	 * A product's ledger, newest first, by page. The cursor is the `seq` the next page starts below (0: the newest), so
	 * a movement written meanwhile never shifts the pages already read.
	 */
	async movements(
		storeId: string,
		productId: string,
		cursor = 0,
	): Promise<ProductsModel["movementsPage"]> {
		await assertProduct(storeId, productId);
		const ofProduct = and(
			eq(stockMovements.storeId, storeId),
			eq(stockMovements.productId, productId),
		);
		const [rows, total] = await Promise.all([
			db
				.select({
					seq: stockMovements.seq,
					id: stockMovements.id,
					type: stockMovements.type,
					quantity: stockMovements.quantity,
					unitCost: stockMovements.unitCost,
					averageCostAfter: stockMovements.averageCostAfter,
					stockAfter: stockMovements.stockAfter,
					reason: stockMovements.reason,
					note: stockMovements.note,
					createdAt: stockMovements.createdAt,
					author: users.name,
					// Null when it didn't come from a purchase, or a sale (left joins).
					purchase: { id: purchases.id, number: purchases.number },
					sale: { id: sales.id, number: sales.number },
				})
				.from(stockMovements)
				.innerJoin(users, eq(users.id, stockMovements.userId))
				.leftJoin(
					purchaseItems,
					eq(purchaseItems.id, stockMovements.purchaseItemId),
				)
				.leftJoin(purchases, eq(purchases.id, purchaseItems.purchaseId))
				.leftJoin(saleItems, eq(saleItems.id, stockMovements.saleItemId))
				.leftJoin(sales, eq(sales.id, saleItems.saleId))
				.where(
					and(ofProduct, cursor ? lt(stockMovements.seq, cursor) : undefined),
				)
				.orderBy(desc(stockMovements.seq))
				// One more than a page tells whether there's a next one.
				.limit(PAGE_SIZE + 1),
			db.$count(stockMovements, ofProduct),
		]);
		const page = rows.slice(0, PAGE_SIZE);
		return {
			items: page.map(toMovement),
			nextCursor: rows.length > PAGE_SIZE ? (page.at(-1)?.seq ?? null) : null,
			total,
		};
	},

	/** Sets the quantity on the shelf, with its reason (estoque.md, "Ajuste"). Archived products too: their units stay. */
	async adjust(
		session: AuthSession,
		productId: string,
		input: ProductsModel["adjustmentBody"],
	): Promise<ProductsModel["productDetail"]> {
		const scope = scopeOf(session);
		await audited(scope.userId, async (tx) => {
			const { product, balance } = await lockForStock(
				tx,
				scope.storeId,
				productId,
			);
			const lots = await openLots(tx, productId, storeToday());
			const plan = planAdjustment(balance, lots, product.hasExpiry, input);
			await recordAdjustment(tx, scope, productId, plan);
		});
		return ProductsService.get(scope.storeId, productId);
	},

	/** Sets the right average cost of the units in stock, with why (estoque.md, "Corrigir custo"). */
	async correctCost(
		session: AuthSession,
		productId: string,
		{ newCost, note }: ProductsModel["costCorrectionBody"],
	): Promise<ProductsModel["productDetail"]> {
		const scope = scopeOf(session);
		await audited(scope.userId, async (tx) => {
			const { balance } = await lockForStock(tx, scope.storeId, productId);
			const plan = planCostCorrection(balance, newCost, note);
			await recordCostCorrection(tx, scope, productId, plan);
		});
		return ProductsService.get(scope.storeId, productId);
	},

	async storeValue(storeId: string): Promise<ProductsModel["stockValue"]> {
		return { value: await storeStockValue(db, storeId) };
	},
};
