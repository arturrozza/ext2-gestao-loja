import {
	and,
	asc,
	desc,
	eq,
	inArray,
	isNotNull,
	isNull,
	type SQL,
} from "drizzle-orm";
import { db } from "../../db";
import { audited, type Executor, type Transaction } from "../../db/audit";
import { nextNumber } from "../../db/numbering";
import { insertedRow } from "../../db/rows";
import {
	products,
	purchaseItems,
	purchases,
	stockLots,
	users,
} from "../../db/schema";
import { expiryToDate, monthOf, storeToday } from "../../lib/dates";
import { httpError } from "../../lib/http-error";
import { nextCursor, PAGE_SIZE } from "../../lib/pagination";
import { photoUrlOf } from "../../lib/photo-storage";
import { blankToNull } from "../../lib/text";
import type { AuthSession } from "../auth/auth.model";
import { lockProducts } from "../products/products.lock";
import { stockLimit } from "../stock/stock.errors";
import {
	recordEntries,
	recordPurchaseCancellation,
	type StockEntry,
} from "../stock/stock.ledger";
import type { CanceledEntry } from "../stock/stock.rules";
import type { PurchasesModel } from "./purchases.model";
import {
	alreadyCanceled,
	assertItems,
	assertPurchaseDate,
	summarizeLines,
	unitsGone,
} from "./purchases.rules";

const notFound = () =>
	httpError(404, {
		code: "purchase_not_found",
		message: "Compra não encontrada.",
	});

type ItemRow = PurchasesModel["item"] & { purchaseId: string };

/** The lines of these purchases, each purchase's in the order they were entered. */
async function findItems(
	executor: Executor,
	purchaseIds: string[],
): Promise<ItemRow[]> {
	if (purchaseIds.length === 0) return [];
	const rows = await executor
		.select({
			purchaseId: purchaseItems.purchaseId,
			id: purchaseItems.id,
			productId: purchaseItems.productId,
			productName: products.name,
			photoKey: products.photoKey,
			quantity: purchaseItems.quantity,
			unitCost: purchaseItems.unitCost,
			expiry: purchaseItems.expiry,
		})
		.from(purchaseItems)
		.innerJoin(products, eq(products.id, purchaseItems.productId))
		.where(inArray(purchaseItems.purchaseId, purchaseIds))
		.orderBy(asc(purchaseItems.purchaseId), asc(purchaseItems.position));
	return rows.map(({ photoKey, expiry, ...row }) => ({
		...row,
		photoUrl: photoUrlOf(photoKey),
		total: row.quantity * row.unitCost,
		expiry: expiry ? monthOf(expiry) : null,
	}));
}

/** Lines by purchase. Every purchase has lines (one at least), so a purchase missing here is a bug, not an empty one. */
function linesOf(rows: ItemRow[]) {
	const byPurchase = Map.groupBy(rows, (row) => row.purchaseId);
	return (purchaseId: string): PurchasesModel["item"][] => {
		const lines = byPurchase.get(purchaseId);
		if (!lines) throw new Error(`purchase ${purchaseId} has no lines`);
		return lines.map(({ purchaseId: _, ...line }) => line);
	};
}

const headerColumns = {
	id: purchases.id,
	number: purchases.number,
	date: purchases.date,
	canceledAt: purchases.canceledAt,
};

type Header = Pick<
	typeof purchases.$inferSelect,
	"id" | "number" | "date" | "canceledAt"
>;

/** The history row of a purchase: its header with the status, and counts and thumbs from its lines. */
function toSummary(
	{ id, number, date, canceledAt }: Header,
	items: PurchasesModel["item"][],
): PurchasesModel["summary"] {
	return {
		id,
		number,
		date,
		status: canceledAt ? "canceled" : "active",
		...summarizeLines(items),
	};
}

async function find(
	executor: Executor,
	storeId: string,
	id: string,
): Promise<PurchasesModel["detail"]> {
	const [purchase] = await executor
		.select({
			...headerColumns,
			note: purchases.note,
			cancelReason: purchases.cancelReason,
			author: users.name,
			createdAt: purchases.createdAt,
		})
		.from(purchases)
		.innerJoin(users, eq(users.id, purchases.userId))
		.where(and(eq(purchases.id, id), eq(purchases.storeId, storeId)));
	if (!purchase) throw notFound();
	const items = (await findItems(executor, [id])).map(
		({ purchaseId: _, ...line }) => line,
	);
	const { note, cancelReason, author, createdAt, canceledAt } = purchase;
	return {
		...toSummary(purchase, items),
		note,
		cancelReason,
		author,
		createdAt: createdAt.toISOString(),
		canceledAt: canceledAt?.toISOString() ?? null,
		items,
	};
}

/** Where clause of the history: the store's purchases, active or canceled when asked. */
function listFilter(
	storeId: string,
	status: PurchasesModel["listQuery"]["status"],
): SQL | undefined {
	return and(
		eq(purchases.storeId, storeId),
		status === "active" ? isNull(purchases.canceledAt) : undefined,
		status === "canceled" ? isNotNull(purchases.canceledAt) : undefined,
	);
}

type ItemInput = PurchasesModel["body"]["items"][number];

/** The lines of a new purchase, as ledger entries in the order entered. */
async function insertLines(
	tx: Transaction,
	storeId: string,
	purchaseId: string,
	items: ItemInput[],
): Promise<StockEntry[]> {
	const lines = await tx
		.insert(purchaseItems)
		.values(
			items.map((item, position) => ({
				storeId,
				purchaseId,
				productId: item.productId,
				position,
				quantity: item.quantity,
				unitCost: item.unitCost,
				expiry: item.expiry ? expiryToDate(item.expiry) : null,
			})),
		)
		.returning({
			purchaseItemId: purchaseItems.id,
			position: purchaseItems.position,
			productId: purchaseItems.productId,
			quantity: purchaseItems.quantity,
			unitCost: purchaseItems.unitCost,
			expiry: purchaseItems.expiry,
		});
	// RETURNING doesn't promise the order of the rows: the position puts them back in the order entered.
	return lines
		.sort((a, b) => a.position - b.position)
		.map(({ position: _, ...line }) => line);
}

/** A line that would take its product's stock past what the ledger holds. */
const lineStockLimit = (index: number) => stockLimit(`items.${index}.quantity`);

/**
 * The lines of a purchase of the store with the lot each brought, in the order entered; none when it isn't the
 * store's. Neither changes after the purchase is entered, so they're read before the product lock (the units still
 * in the lots are read under it, by the ledger).
 */
function cancelLines(
	tx: Transaction,
	storeId: string,
	purchaseId: string,
): Promise<CanceledEntry[]> {
	return tx
		.select({
			purchaseItemId: purchaseItems.id,
			productId: purchaseItems.productId,
			quantity: purchaseItems.quantity,
			unitCost: purchaseItems.unitCost,
			lotId: stockLots.id,
		})
		.from(purchaseItems)
		.innerJoin(stockLots, eq(stockLots.purchaseItemId, purchaseItems.id))
		.where(
			and(
				eq(purchaseItems.purchaseId, purchaseId),
				eq(purchaseItems.storeId, storeId),
			),
		)
		.orderBy(asc(purchaseItems.position));
}

/**
 * Marks a purchase canceled, if it isn't yet. Run under the product lock: a second cancellation waits there and then
 * finds it marked. Whatever fails after it rolls the mark back with the transaction.
 */
async function markCanceled(
	tx: Transaction,
	storeId: string,
	purchaseId: string,
	reason: string | null,
): Promise<void> {
	const marked = await tx
		.update(purchases)
		.set({ canceledAt: new Date(), cancelReason: blankToNull(reason) })
		.where(
			and(
				eq(purchases.id, purchaseId),
				eq(purchases.storeId, storeId),
				isNull(purchases.canceledAt),
			),
		)
		.returning({ id: purchases.id });
	if (marked.length === 0) throw alreadyCanceled();
}

/**
 * Purchases (docs/product/compras.md): the goods coming into the store. Every line feeds the stock ledger, which keeps
 * the quantity and the average cost.
 */
export const PurchasesService = {
	/** The history, newest entered first (the number follows the order they were entered in). */
	async list(
		storeId: string,
		query: PurchasesModel["listQuery"],
	): Promise<PurchasesModel["page"]> {
		const cursor = query.cursor ?? 0;
		const filter = listFilter(storeId, query.status);
		const [headers, total] = await Promise.all([
			db
				.select(headerColumns)
				.from(purchases)
				.where(filter)
				.orderBy(desc(purchases.number))
				.limit(PAGE_SIZE)
				.offset(cursor),
			db.$count(purchases, filter),
		]);
		// Every line of the page, for the counts and thumbs: at most 30 × 100 rows, fine for a store. Counting in SQL
		// would repeat `summarizeLines`; revisit if purchases grow that big.
		const lines = linesOf(
			await findItems(
				db,
				headers.map((header) => header.id),
			),
		);
		return {
			items: headers.map((header) => toSummary(header, lines(header.id))),
			nextCursor: nextCursor(cursor, total),
			total,
		};
	},

	get(storeId: string, id: string): Promise<PurchasesModel["detail"]> {
		return find(db, storeId, id);
	},

	/**
	 * Enters a purchase: the purchase, its lines, and a lot and an entry in the ledger for each line, all or nothing.
	 * The average cost follows the order purchases are entered in, whatever their date (docs/decisions.md).
	 */
	create(
		session: AuthSession,
		input: PurchasesModel["body"],
	): Promise<PurchasesModel["detail"]> {
		const storeId = session.store.id;
		const userId = session.user.id;
		const today = storeToday();
		assertPurchaseDate(input.date, today);
		return audited(userId, async (tx) => {
			const ids = [...new Set(input.items.map((item) => item.productId))];
			assertItems(
				input.items,
				await lockProducts(tx, storeId, ids),
				monthOf(today),
			);
			const purchase = insertedRow(
				await tx
					.insert(purchases)
					.values({
						storeId,
						userId,
						number: await nextNumber(tx, purchases, storeId),
						date: input.date,
						note: blankToNull(input.note),
					})
					.returning({ id: purchases.id }),
			);
			const entries = await insertLines(tx, storeId, purchase.id, input.items);
			await recordEntries(tx, { storeId, userId }, entries, lineStockLimit);
			return find(tx, storeId, purchase.id);
		});
	},

	/**
	 * Cancels a purchase (compras.md, "Cancelamento"): every lot it brought goes back to zero and leaves with the value
	 * it brought, and it stays in the history, marked. Only once, and only while all its units are still in stock.
	 */
	cancel(
		session: AuthSession,
		id: string,
		input: PurchasesModel["cancelBody"],
	): Promise<PurchasesModel["detail"]> {
		const storeId = session.store.id;
		const userId = session.user.id;
		return audited(userId, async (tx) => {
			const lines = await cancelLines(tx, storeId, id);
			if (lines.length === 0) throw notFound();
			// Products first, like every stock write (products.lock.ts).
			await lockProducts(
				tx,
				storeId,
				lines.map((line) => line.productId),
			);
			await markCanceled(tx, storeId, id, input.reason);
			await recordPurchaseCancellation(
				tx,
				{ storeId, userId },
				lines,
				unitsGone,
			);
			return find(tx, storeId, id);
		});
	},
};
