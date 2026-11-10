import { and, asc, eq, isNotNull, isNull, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { audited, type Executor, type Transaction } from "../../db/audit";
import { archivedAtValue, insertedRow } from "../../db/rows";
import { customers } from "../../db/schema";
import { httpError } from "../../lib/http-error";
import { nextCursor, PAGE_SIZE } from "../../lib/pagination";
import { personSearchFilter } from "../../lib/person";
import type { AuthSession } from "../auth/auth.model";
import { customerSalesColumns } from "../sales/sales.totals";
import type { CustomersModel } from "./customers.model";
import { normalizeCustomer } from "./customers.rules";

const columns = {
	id: customers.id,
	name: customers.name,
	phone: customers.phone,
	address: customers.address,
	note: customers.note,
	archivedAt: customers.archivedAt,
	// What they bought: canceled sales never count (clientes.md).
	...customerSalesColumns(),
};

type CustomerRow = Omit<CustomersModel["customer"], "archived"> & {
	archivedAt: Date | null;
};

function toCustomer({
	archivedAt,
	...row
}: CustomerRow): CustomersModel["customer"] {
	return { ...row, archived: archivedAt !== null };
}

/** The customer `id`, only if it belongs to the store. */
const inStore = (storeId: string, id: string) =>
	and(eq(customers.id, id), eq(customers.storeId, storeId));

const notFound = () =>
	httpError(404, {
		code: "customer_not_found",
		message: "Cliente não encontrado.",
	});

async function find(executor: Executor, storeId: string, id: string) {
	const [row] = await executor
		.select(columns)
		.from(customers)
		.where(inStore(storeId, id));
	if (!row) throw notFound();
	return toCustomer(row);
}

/** Where clause of the list: active or archived, and every search word in the name or phone (a masked phone included). */
function listFilter(
	storeId: string,
	query: CustomersModel["listQuery"],
): SQL | undefined {
	return and(
		eq(customers.storeId, storeId),
		query.archived
			? isNotNull(customers.archivedAt)
			: isNull(customers.archivedAt),
		...personSearchFilter(customers.searchText, query.search),
	);
}

/** Locks the customer for an edit: it must be in the store and active (archived ones aren't edited, like resellers). */
async function lockEditable(tx: Transaction, storeId: string, id: string) {
	const [current] = await tx
		.select({ archivedAt: customers.archivedAt })
		.from(customers)
		.where(inStore(storeId, id))
		.for("update");
	if (!current) throw notFound();
	if (current.archivedAt) {
		throw httpError(409, {
			code: "customer_archived",
			message: "Cliente arquivado não pode ser editado. Reative ele primeiro.",
		});
	}
}

/**
 * Regular customers of a store (docs/product/clientes.md): they can be many, so the list is paginated. Only active
 * ones go into new sales; archived ones stay in the history.
 */
export const CustomersService = {
	async list(
		storeId: string,
		query: CustomersModel["listQuery"],
	): Promise<CustomersModel["page"]> {
		const cursor = query.cursor ?? 0;
		const filter = listFilter(storeId, query);
		const [rows, total] = await Promise.all([
			db
				.select(columns)
				.from(customers)
				.where(filter)
				.orderBy(asc(customers.name), asc(customers.id))
				.limit(PAGE_SIZE)
				.offset(cursor),
			db.$count(customers, filter),
		]);
		return {
			items: rows.map(toCustomer),
			nextCursor: nextCursor(cursor, total),
			total,
		};
	},

	get(storeId: string, id: string): Promise<CustomersModel["customer"]> {
		return find(db, storeId, id);
	},

	/** From the customers screen, or from a sale with only the name (clientes.md). */
	create(
		session: AuthSession,
		input: CustomersModel["body"],
	): Promise<CustomersModel["customer"]> {
		const storeId = session.store.id;
		const values = normalizeCustomer(input);
		return audited(session.user.id, async (tx) => {
			const { id } = insertedRow(
				await tx
					.insert(customers)
					.values({ storeId, ...values })
					.returning({ id: customers.id }),
			);
			return find(tx, storeId, id);
		});
	},

	update(
		session: AuthSession,
		id: string,
		input: CustomersModel["body"],
	): Promise<CustomersModel["customer"]> {
		const storeId = session.store.id;
		const values = normalizeCustomer(input);
		return audited(session.user.id, async (tx) => {
			await lockEditable(tx, storeId, id);
			await tx.update(customers).set(values).where(inStore(storeId, id));
			return find(tx, storeId, id);
		});
	},

	/** Archived: out of new sales, kept in the history. Archiving twice keeps the first date. */
	setArchived(
		session: AuthSession,
		id: string,
		archived: boolean,
	): Promise<CustomersModel["customer"]> {
		const storeId = session.store.id;
		return audited(session.user.id, async (tx) => {
			await tx
				.update(customers)
				.set({ archivedAt: archivedAtValue(customers.archivedAt, archived) })
				.where(inStore(storeId, id));
			return find(tx, storeId, id);
		});
	},
};
