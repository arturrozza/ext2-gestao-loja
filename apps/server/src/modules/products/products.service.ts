import {
	and,
	asc,
	eq,
	inArray,
	isNotNull,
	isNull,
	like,
	ne,
	type SQL,
	sql,
} from "drizzle-orm";
import { db } from "../../db";
import { audited, type Executor, type Transaction } from "../../db/audit";
import { archivedAtValue, insertedRow } from "../../db/rows";
import { categories, products } from "../../db/schema";
import { guardUnique, httpError } from "../../lib/http-error";
import { nextCursor, PAGE_SIZE } from "../../lib/pagination";
import { searchPatterns } from "../../lib/search";
import type { AuthSession } from "../auth/auth.model";
import type { ProductsModel } from "./products.model";
import { normalizeProduct, type ProductValues } from "./products.rules";

const columns = {
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
	archivedAt: products.archivedAt,
};

type ProductRow = Omit<ProductsModel["product"], "archived"> & {
	archivedAt: Date | null;
};

function toProduct({
	archivedAt,
	...row
}: ProductRow): ProductsModel["product"] {
	return { ...row, archived: archivedAt !== null };
}

const notFound = () =>
	httpError(404, {
		code: "product_not_found",
		message: "Produto não encontrado.",
	});

function selectProducts(executor: Executor = db) {
	return executor
		.select(columns)
		.from(products)
		.leftJoin(categories, eq(categories.id, products.categoryId));
}

async function find(executor: Executor, storeId: string, id: string) {
	const [row] = await selectProducts(executor).where(
		and(eq(products.id, id), eq(products.storeId, storeId)),
	);
	if (!row) throw notFound();
	return toProduct(row);
}

/** Where clause of the list: active or archived, any of the categories, and every search word somewhere. */
function listFilter(
	storeId: string,
	query: ProductsModel["listQuery"],
): SQL | undefined {
	const filters = [
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

/** Locks the product for an edit: it must be in the store and active (archived products aren't edited, produtos.md). */
async function lockEditable(tx: Transaction, storeId: string, id: string) {
	const [current] = await tx
		.select({
			categoryId: products.categoryId,
			archivedAt: products.archivedAt,
		})
		.from(products)
		.where(and(eq(products.id, id), eq(products.storeId, storeId)))
		.for("update");
	if (!current) throw notFound();
	if (current.archivedAt) {
		throw httpError(409, {
			code: "product_archived",
			message: "Produto arquivado não pode ser editado. Reative ele primeiro.",
		});
	}
	return current;
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
		const filter = listFilter(storeId, query);
		const [rows, total] = await Promise.all([
			selectProducts()
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

	get(storeId: string, id: string): Promise<ProductsModel["product"]> {
		return find(db, storeId, id);
	},

	create(
		session: AuthSession,
		input: ProductsModel["body"],
	): Promise<ProductsModel["product"]> {
		const storeId = session.store.id;
		const values = normalizeProduct(input);
		return guardUnique(
			() =>
				audited(session.user.id, async (tx) => {
					await checkCategory(tx, storeId, values.categoryId);
					const { id } = insertedRow(
						await tx
							.insert(products)
							.values({ storeId, ...values })
							.returning({ id: products.id }),
					);
					return find(tx, storeId, id);
				}),
			() => codeTaken(storeId, values, null),
		);
	},

	update(
		session: AuthSession,
		id: string,
		input: ProductsModel["body"],
	): Promise<ProductsModel["product"]> {
		const storeId = session.store.id;
		const values = normalizeProduct(input);
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
						.set(values)
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
	): Promise<ProductsModel["product"]> {
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
