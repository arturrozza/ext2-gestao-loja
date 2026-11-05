import {
	and,
	asc,
	eq,
	isNotNull,
	isNull,
	like,
	or,
	type SQL,
} from "drizzle-orm";
import { db } from "../../db";
import { audited, type Executor, type Transaction } from "../../db/audit";
import { archivedAtValue, insertedRow } from "../../db/rows";
import { resellers } from "../../db/schema";
import { httpError } from "../../lib/http-error";
import { percentOut } from "../../lib/percent";
import { likePattern } from "../../lib/search";
import type { AuthSession } from "../auth/auth.model";
import type { ResellersModel } from "./resellers.model";
import { normalizeReseller, resellerSearchTerms } from "./resellers.rules";

const columns = {
	id: resellers.id,
	name: resellers.name,
	phone: resellers.phone,
	defaultCommission: resellers.defaultCommission,
	note: resellers.note,
	archivedAt: resellers.archivedAt,
};

type ResellerRow = Pick<
	ResellersModel["reseller"],
	"id" | "name" | "phone" | "defaultCommission" | "note"
> & { archivedAt: Date | null };

/**
 * Sales totals are zero until sales exist (MUN-16), which will sum the reseller's active sales here (canceled ones
 * never count, revendedoras.md).
 */
const NO_SALES = { salesCount: 0, salesTotal: "0.00", commissionTotal: "0.00" };

function toReseller(row: ResellerRow): ResellersModel["reseller"] {
	const { archivedAt, defaultCommission, ...rest } = row;
	return {
		...rest,
		defaultCommission: percentOut(defaultCommission),
		archived: archivedAt !== null,
		...NO_SALES,
	};
}

/** The reseller `id`, only if it belongs to the store. */
const inStore = (storeId: string, id: string) =>
	and(eq(resellers.id, id), eq(resellers.storeId, storeId));

const notFound = () =>
	httpError(404, {
		code: "reseller_not_found",
		message: "Revendedora não encontrada.",
	});

async function find(executor: Executor, storeId: string, id: string) {
	const [row] = await executor
		.select(columns)
		.from(resellers)
		.where(inStore(storeId, id));
	if (!row) throw notFound();
	return toReseller(row);
}

/** Where clause of the list: active or archived, and every search word in the name or phone (a masked phone included). */
function listFilter(
	storeId: string,
	query: ResellersModel["listQuery"],
): SQL | undefined {
	return and(
		eq(resellers.storeId, storeId),
		query.archived
			? isNotNull(resellers.archivedAt)
			: isNull(resellers.archivedAt),
		...resellerSearchTerms(query.search).map((alternatives) =>
			or(
				...alternatives.map((term) =>
					like(resellers.searchText, likePattern(term)),
				),
			),
		),
	);
}

/** Locks the reseller for an edit: it must be in the store and active (archived ones aren't edited, like products). */
async function lockEditable(tx: Transaction, storeId: string, id: string) {
	const [current] = await tx
		.select({ archivedAt: resellers.archivedAt })
		.from(resellers)
		.where(inStore(storeId, id))
		.for("update");
	if (!current) throw notFound();
	if (current.archivedAt) {
		throw httpError(409, {
			code: "reseller_archived",
			message:
				"Revendedora arquivada não pode ser editada. Reative ela primeiro.",
		});
	}
}

/**
 * Resellers of a store (docs/product/revendedoras.md): a handful per store, so the list isn't paginated. Only active
 * ones go into new sales; archived ones stay in the history and the reports.
 */
export const ResellersService = {
	async list(
		storeId: string,
		query: ResellersModel["listQuery"],
	): Promise<ResellersModel["reseller"][]> {
		const rows = await db
			.select(columns)
			.from(resellers)
			.where(listFilter(storeId, query))
			.orderBy(asc(resellers.name), asc(resellers.id));
		return rows.map(toReseller);
	},

	get(storeId: string, id: string): Promise<ResellersModel["reseller"]> {
		return find(db, storeId, id);
	},

	create(
		session: AuthSession,
		input: ResellersModel["body"],
	): Promise<ResellersModel["reseller"]> {
		const storeId = session.store.id;
		const values = normalizeReseller(input);
		return audited(session.user.id, async (tx) => {
			const { id } = insertedRow(
				await tx
					.insert(resellers)
					.values({ storeId, ...values })
					.returning({ id: resellers.id }),
			);
			return find(tx, storeId, id);
		});
	},

	/** A new default commission only reaches new sales: past sales keep theirs (revendedoras.md). */
	update(
		session: AuthSession,
		id: string,
		input: ResellersModel["body"],
	): Promise<ResellersModel["reseller"]> {
		const storeId = session.store.id;
		const values = normalizeReseller(input);
		return audited(session.user.id, async (tx) => {
			await lockEditable(tx, storeId, id);
			await tx.update(resellers).set(values).where(inStore(storeId, id));
			return find(tx, storeId, id);
		});
	},

	/** Archived: out of new sales, kept in the history. Archiving twice keeps the first date. */
	setArchived(
		session: AuthSession,
		id: string,
		archived: boolean,
	): Promise<ResellersModel["reseller"]> {
		const storeId = session.store.id;
		return audited(session.user.id, async (tx) => {
			await tx
				.update(resellers)
				.set({ archivedAt: archivedAtValue(resellers.archivedAt, archived) })
				.where(inStore(storeId, id));
			return find(tx, storeId, id);
		});
	},
};
