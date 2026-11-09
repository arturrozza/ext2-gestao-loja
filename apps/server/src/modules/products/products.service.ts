import {
	and,
	asc,
	eq,
	inArray,
	isNotNull,
	isNull,
	like,
	ne,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import { db } from "../../db";
import { audited, type Executor, type Transaction } from "../../db/audit";
import { archivedAtValue, insertedRow } from "../../db/rows";
import { categories, products } from "../../db/schema";
import { type ISODate, storeToday } from "../../lib/dates";
import { guardUnique, httpError } from "../../lib/http-error";
import { nextCursor, PAGE_SIZE } from "../../lib/pagination";
import { photoStorage, photoUrlOf } from "../../lib/photo-storage";
import { searchPatterns } from "../../lib/search";
import type { AuthSession } from "../auth/auth.model";
import {
	stockByExpiry,
	stockColumns,
	stockStateFilter,
} from "../stock/stock.queries";
import { stockSummary } from "../stock/stock.rules";
import type { ProductsModel } from "./products.model";
import {
	assertJpeg,
	assertStorePhotoKey,
	newPhotoKey,
	PHOTO_CONTENT_TYPE,
	photoNotFound,
} from "./products.photo";
import {
	normalizeProduct,
	notFound,
	type ProductValues,
} from "./products.rules";

/** A product with its stock on `today` (the day decides which units are sellable). */
const columns = (today: ISODate) => ({
	id: products.id,
	name: products.name,
	basePrice: products.basePrice,
	categoryId: products.categoryId,
	categoryName: categories.name,
	barcode: products.barcode,
	internalCode: products.internalCode,
	minStock: products.minStock,
	location: products.location,
	hasExpiry: products.hasExpiry,
	photoKey: products.photoKey,
	archivedAt: products.archivedAt,
	figures: stockColumns(today),
});

type ProductRow = Awaited<ReturnType<typeof selectProducts>>[number];

function toProduct({
	archivedAt,
	photoKey,
	figures,
	...row
}: ProductRow): ProductsModel["product"] {
	return {
		...row,
		photoUrl: photoUrlOf(photoKey),
		archived: archivedAt !== null,
		...stockSummary(figures, row.minStock),
	};
}

/**
 * The photo columns of a save: left out keeps the current photo, `null` removes it, and a key must be one the API
 * stored for this store. Checked before the transaction: it asks the bucket, and no row is locked while it waits.
 */
async function checkedPhotoColumns(
	storeId: string,
	photoKey: string | null | undefined,
): Promise<{ photoKey?: string | null }> {
	if (photoKey === undefined) return {};
	if (photoKey !== null) {
		assertStorePhotoKey(storeId, photoKey);
		if (!(await photoStorage().exists(photoKey))) throw photoNotFound();
	}
	return { photoKey };
}

function selectProducts(executor: Executor, today: ISODate) {
	return executor
		.select(columns(today))
		.from(products)
		.leftJoin(categories, eq(categories.id, products.categoryId));
}

/** One product of the store with its units by expiry, or a 404. */
async function find(
	executor: Executor,
	storeId: string,
	id: string,
): Promise<ProductsModel["productDetail"]> {
	const today = storeToday();
	const [row] = await selectProducts(executor, today).where(
		and(eq(products.id, id), eq(products.storeId, storeId)),
	);
	if (!row) throw notFound();
	return {
		...toProduct(row),
		expiries: await stockByExpiry(executor, id, today),
	};
}

/**
 * Where clause of the list: active or archived, any of the categories, any of the stock states, and every search word
 * somewhere.
 */
function listFilter(
	storeId: string,
	query: ProductsModel["listQuery"],
	today: ISODate,
): SQL | undefined {
	const filters: (SQL | undefined)[] = [
		eq(products.storeId, storeId),
		query.archived
			? isNotNull(products.archivedAt)
			: isNull(products.archivedAt),
		...searchPatterns(query.search).map((pattern) =>
			like(products.searchText, pattern),
		),
	];
	if (query.categoryIds?.length) {
		filters.push(inArray(products.categoryId, query.categoryIds));
	}
	if (query.stock?.length) {
		filters.push(
			or(...query.stock.map((state) => stockStateFilter(state, today))),
		);
	}
	return and(...filters);
}

/**
 * The category of a save must be one of the store's, and active (an archived one is hidden from the form). A product
 * already in an archived category may keep it.
 */
async function checkCategory(
	tx: Transaction,
	storeId: string,
	categoryId: string | null,
	current: string | null = null,
) {
	if (!categoryId || categoryId === current) return;
	const [category] = await tx
		.select({ archivedAt: categories.archivedAt })
		.from(categories)
		.where(and(eq(categories.id, categoryId), eq(categories.storeId, storeId)))
		.for("share");
	if (!category || category.archivedAt) {
		throw httpError(422, {
			code: category ? "category_archived" : "category_not_found",
			message: category
				? "Essa categoria está arquivada."
				: "Categoria não encontrada.",
			field: "categoryId",
		});
	}
}

/** Another product of the store (archived ones included) with this value in `column`. */
async function codeInUse(
	storeId: string,
	clash: SQL,
	excludeId: string | null,
): Promise<boolean> {
	const [other] = await db
		.select({ id: products.id })
		.from(products)
		.where(
			and(
				eq(products.storeId, storeId),
				excludeId ? ne(products.id, excludeId) : undefined,
				clash,
			),
		)
		.limit(1);
	return other !== undefined;
}

/** The 409 for a code another product of the store already has, on the field that clashed (the barcode first). */
async function codeTaken(
	storeId: string,
	values: ProductValues,
	excludeId: string | null,
) {
	const { barcode, internalCode } = values;
	if (
		barcode &&
		(await codeInUse(storeId, eq(products.barcode, barcode), excludeId))
	) {
		return httpError(409, {
			code: "duplicate_barcode",
			message: "Já existe um produto com esse código de barras.",
			field: "barcode",
		});
	}
	const sameInternalCode = sql`lower(${products.internalCode}) = lower(${internalCode})`;
	if (internalCode && (await codeInUse(storeId, sameInternalCode, excludeId))) {
		return httpError(409, {
			code: "duplicate_internal_code",
			message: "Já existe um produto com esse código interno.",
			field: "internalCode",
		});
	}
	return undefined;
}

function selectEditable(executor: Executor, storeId: string, id: string) {
	return executor
		.select({
			categoryId: products.categoryId,
			archivedAt: products.archivedAt,
		})
		.from(products)
		.where(and(eq(products.id, id), eq(products.storeId, storeId)));
}

/** A product can be edited when it is in the store and active (archived products aren't edited, produtos.md). */
function assertEditable<T extends { archivedAt: Date | null }>(
	current: T | undefined,
): T {
	if (!current) throw notFound();
	if (current.archivedAt) {
		throw httpError(409, {
			code: "product_archived",
			message: "Produto arquivado não pode ser editado. Reative ele primeiro.",
		});
	}
	return current;
}

/** Locks the product for an edit, after checking it can be edited. */
async function lockEditable(tx: Transaction, storeId: string, id: string) {
	const [current] = await selectEditable(tx, storeId, id).for("update");
	return assertEditable(current);
}

/**
 * Products of a store (docs/product/produtos.md). Stock and cost never come in here: they start at zero and only
 * purchases and stock corrections change them.
 */
export const ProductsService = {
	async list(
		storeId: string,
		query: ProductsModel["listQuery"],
	): Promise<ProductsModel["page"]> {
		const cursor = query.cursor ?? 0;
		const today = storeToday();
		const filter = listFilter(storeId, query, today);
		const [rows, total] = await Promise.all([
			selectProducts(db, today)
				.where(filter)
				.orderBy(asc(products.name), asc(products.id))
				.limit(PAGE_SIZE)
				.offset(cursor),
			db.$count(products, filter),
		]);
		return {
			items: rows.map(toProduct),
			nextCursor: nextCursor(cursor, total),
			total,
		};
	},

	get(storeId: string, id: string): Promise<ProductsModel["productDetail"]> {
		return find(db, storeId, id);
	},

	/**
	 * Stores one photo the app sent (a JPEG it already shrank) under a new key, which the product form then saves. A
	 * photo sent for a form that is never saved stays in the bucket unused (~150 KB; see docs/decisions.md).
	 */
	async uploadPhoto(
		session: AuthSession,
		photo: File,
	): Promise<ProductsModel["uploadedPhoto"]> {
		const storeId = session.store.id;
		const userId = session.user.id;
		const bytes = new Uint8Array(await photo.arrayBuffer());
		assertJpeg(bytes);
		const key = newPhotoKey(storeId);
		await photoStorage().write(key, bytes, PHOTO_CONTENT_TYPE);
		// The bucket keeps no author: this line is the trail of who stored what.
		console.info("[photos] stored", { storeId, userId, key });
		return { key };
	},

	async create(
		session: AuthSession,
		input: ProductsModel["body"],
	): Promise<ProductsModel["productDetail"]> {
		const storeId = session.store.id;
		const values = normalizeProduct(input);
		const photo = await checkedPhotoColumns(storeId, input.photoKey);
		return guardUnique(
			() =>
				audited(session.user.id, async (tx) => {
					await checkCategory(tx, storeId, values.categoryId);
					const { id } = insertedRow(
						await tx
							.insert(products)
							.values({ storeId, ...values, ...photo })
							.returning({ id: products.id }),
					);
					return find(tx, storeId, id);
				}),
			() => codeTaken(storeId, values, null),
		);
	},

	async update(
		session: AuthSession,
		id: string,
		input: ProductsModel["body"],
	): Promise<ProductsModel["productDetail"]> {
		const storeId = session.store.id;
		const values = normalizeProduct(input);
		if (typeof input.photoKey === "string") {
			// Unknown or archived answers before the bucket is asked about a new photo (no row is locked meanwhile).
			assertEditable((await selectEditable(db, storeId, id))[0]);
		}
		const photo = await checkedPhotoColumns(storeId, input.photoKey);
		return guardUnique(
			() =>
				audited(session.user.id, async (tx) => {
					const current = await lockEditable(tx, storeId, id);
					await checkCategory(
						tx,
						storeId,
						values.categoryId,
						current.categoryId,
					);
					await tx
						.update(products)
						.set({ ...values, ...photo })
						.where(and(eq(products.id, id), eq(products.storeId, storeId)));
					return find(tx, storeId, id);
				}),
			() => codeTaken(storeId, values, id),
		);
	},

	/** Archived: out of new purchases and sales, kept in the history. Archiving twice keeps the first date. */
	setArchived(
		session: AuthSession,
		id: string,
		archived: boolean,
	): Promise<ProductsModel["productDetail"]> {
		const storeId = session.store.id;
		return audited(session.user.id, async (tx) => {
			await tx
				.update(products)
				.set({ archivedAt: archivedAtValue(products.archivedAt, archived) })
				.where(and(eq(products.id, id), eq(products.storeId, storeId)));
			return find(tx, storeId, id);
		});
	},
};
