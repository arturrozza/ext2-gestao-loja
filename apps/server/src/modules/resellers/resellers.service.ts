import { and, asc, eq, isNotNull, isNull, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { audited, type Executor, type Transaction } from "../../db/audit";
import { archivedAtValue, insertedRow } from "../../db/rows";
import { resellers } from "../../db/schema";
import { type ISODate, storeToday } from "../../lib/dates";
import { httpError } from "../../lib/http-error";
import { personSearchFilter } from "../../lib/person";
import type { AuthSession } from "../auth/auth.model";
import type { SalePeriod } from "../sales/sales.model";
import { periodStart } from "../sales/sales.rules";
import { resellerSalesColumns } from "../sales/sales.totals";
import type { ResellersModel } from "./resellers.model";
import { normalizeReseller } from "./resellers.rules";

/** The reseller with her active sales from `since` on (every sale when null): canceled ones never count. */
const columns = (since: ISODate | null) => ({
	id: resellers.id,
	name: resellers.name,
	phone: resellers.phone,
	defaultCommission: resellers.defaultCommission,
	note: resellers.note,
	archivedAt: resellers.archivedAt,
	...resellerSalesColumns(since),
});

type ResellerRow = Omit<ResellersModel["reseller"], "archived"> & {
	archivedAt: Date | null;
};

function toReseller({
	archivedAt,
	...row
}: ResellerRow): ResellersModel["reseller"] {
	return { ...row, archived: archivedAt !== null };
}

/** The reseller `id`, only if it belongs to the store. */
const inStore = (storeId: string, id: string) =>
	and(eq(resellers.id, id), eq(resellers.storeId, storeId));

const notFound = () =>
	httpError(404, {
		code: "reseller_not_found",
		message: "Revendedora não encontrada.",
	});

/** A reseller of the store with her totals from `since` on (every sale when null). */
async function find(
	executor: Executor,
	storeId: string,
	id: string,
	since: ISODate | null,
) {
	const [row] = await executor
		.select(columns(since))
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
		...personSearchFilter(resellers.searchText, query.search),
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
			.select(columns(null))
			.from(resellers)
			.where(listFilter(storeId, query))
			.orderBy(asc(resellers.name), asc(resellers.id));
		return rows.map(toReseller);
	},

	/** With her sales and commissions in the period (revendedoras.md); every sale when left out. */
	get(
		storeId: string,
		id: string,
		period: SalePeriod = "all",
	): Promise<ResellersModel["reseller"]> {
		return find(db, storeId, id, periodStart(period, storeToday()));
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
			return find(tx, storeId, id, null);
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
			return find(tx, storeId, id, null);
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
			return find(tx, storeId, id, null);
		});
	},
};
