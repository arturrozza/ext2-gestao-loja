import { and, asc, count, eq, isNull, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { audited, type Executor } from "../../db/audit";
import { archivedAtValue, insertedRow } from "../../db/rows";
import { categories, products } from "../../db/schema";
import { guardUnique, httpError } from "../../lib/http-error";
import { normalizeSearch } from "../../lib/search";
import type { AuthSession } from "../auth/auth.model";
import type { CategoriesModel } from "./categories.model";

const notFound = () =>
	httpError(404, {
		code: "category_not_found",
		message: "Categoria não encontrada.",
	});

/** Categories of the store with their active product count, by name. */
async function select(executor: Executor, storeId: string, filter?: SQL) {
	const rows = await executor
		.select({
			id: categories.id,
			name: categories.name,
			archivedAt: categories.archivedAt,
			productCount: count(products.id),
		})
		.from(categories)
		.leftJoin(
			products,
			and(eq(products.categoryId, categories.id), isNull(products.archivedAt)),
		)
		.where(and(eq(categories.storeId, storeId), filter))
		.groupBy(categories.id)
		.orderBy(asc(categories.name), asc(categories.id));
	return rows.map(({ archivedAt, ...row }): CategoriesModel["category"] => ({
		...row,
		archived: archivedAt !== null,
	}));
}

async function find(executor: Executor, storeId: string, id: string) {
	const [category] = await select(executor, storeId, eq(categories.id, id));
	if (!category) throw notFound();
	return category;
}

/**
 * The 409 for a name already taken in the store. An archived one says so, since it's hidden from the pickers: the way
 * out is reactivating it.
 */
async function nameTaken(storeId: string, normalizedName: string) {
	const [existing] = await db
		.select({ archivedAt: categories.archivedAt })
		.from(categories)
		.where(
			and(
				eq(categories.storeId, storeId),
				eq(categories.normalizedName, normalizedName),
			),
		);
	if (!existing) return undefined;
	return httpError(409, {
		code: "duplicate_category",
		message: existing.archivedAt
			? "Essa categoria já existe, arquivada. Reative ela na lista."
			: "Essa categoria já existe.",
		field: "name",
	});
}

/** The name as saved (trimmed, single spaces) and its key for the unique check. */
function nameColumns(input: CategoriesModel["body"]) {
	const name = input.name.trim().replace(/\s+/g, " ");
	return { name, normalizedName: normalizeSearch(name) };
}

/**
 * Store categories (docs/product/produtos.md): created, renamed, archived and reactivated, never deleted. The name is
 * unique in the store regardless of case and accents, archived ones included.
 */
export const CategoriesService = {
	list(storeId: string): Promise<CategoriesModel["category"][]> {
		return select(db, storeId);
	},

	create(
		session: AuthSession,
		input: CategoriesModel["body"],
	): Promise<CategoriesModel["category"]> {
		const storeId = session.store.id;
		const values = nameColumns(input);
		return guardUnique(
			() =>
				audited(session.user.id, async (tx) => {
					const { id } = insertedRow(
						await tx
							.insert(categories)
							.values({ storeId, ...values })
							.returning({ id: categories.id }),
					);
					return find(tx, storeId, id);
				}),
			() => nameTaken(storeId, values.normalizedName),
		);
	},

	rename(
		session: AuthSession,
		id: string,
		input: CategoriesModel["body"],
	): Promise<CategoriesModel["category"]> {
		const storeId = session.store.id;
		const values = nameColumns(input);
		return guardUnique(
			() =>
				audited(session.user.id, async (tx) => {
					await tx
						.update(categories)
						.set(values)
						.where(and(eq(categories.id, id), eq(categories.storeId, storeId)));
					return find(tx, storeId, id);
				}),
			() => nameTaken(storeId, values.normalizedName),
		);
	},

	/**
	 * Archived: hidden from the product form and the list filter, but products already in it keep it (and so do the
	 * reports). Archiving twice keeps the first date.
	 */
	setArchived(
		session: AuthSession,
		id: string,
		archived: boolean,
	): Promise<CategoriesModel["category"]> {
		const storeId = session.store.id;
		return audited(session.user.id, async (tx) => {
			await tx
				.update(categories)
				.set({ archivedAt: archivedAtValue(categories.archivedAt, archived) })
				.where(and(eq(categories.id, id), eq(categories.storeId, storeId)));
			return find(tx, storeId, id);
		});
	},
};
