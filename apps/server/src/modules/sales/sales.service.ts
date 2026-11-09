import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { audited, type Transaction } from "../../db/audit";
import { nextNumber } from "../../db/numbering";
import { insertedRow } from "../../db/rows";
import {
	customers,
	resellers,
	saleCosts,
	saleItems,
	sales,
} from "../../db/schema";
import { storeToday } from "../../lib/dates";
import { blankToNull } from "../../lib/text";
import type { AuthSession } from "../auth/auth.model";
import { lockProducts } from "../products/products.lock";
import { recordSaleExits } from "../stock/stock.ledger";
import { sellableLots, stockBalances } from "../stock/stock.queries";
import type { SalesModel } from "./sales.model";
import { findSale, listSales } from "./sales.queries";
import {
	assertChannel,
	assertItems,
	assertParty,
	assertSaleDate,
	assertUniqueProducts,
	computeTotals,
	type PartyState,
	type PlannedLine,
	planLines,
	type SaleTotals,
} from "./sales.rules";

type Body = SalesModel["body"];
type Totals = SaleTotals<Body["costs"][number]>;

/**
 * The customer or reseller of a new sale, locked `FOR SHARE` so it can't be archived until the sale is in. Both tables
 * keep the store and the archive date the same way.
 */
async function lockParty(
	tx: Transaction,
	table: typeof customers | typeof resellers,
	storeId: string,
	id: string,
): Promise<PartyState> {
	const [row] = await tx
		.select({ archivedAt: table.archivedAt })
		.from(table)
		.where(and(eq(table.id, id), eq(table.storeId, storeId)))
		.for("share");
	if (!row) return "missing";
	return row.archivedAt ? "archived" : "active";
}

/** The customer and the reseller of a new sale: when sent, each must be the store's and active. */
async function assertParties(
	tx: Transaction,
	storeId: string,
	{ customerId, resellerId }: Body,
): Promise<void> {
	if (customerId) {
		assertParty(
			"customerId",
			await lockParty(tx, customers, storeId, customerId),
		);
	}
	if (resellerId) {
		assertParty(
			"resellerId",
			await lockParty(tx, resellers, storeId, resellerId),
		);
	}
}

async function insertSale(
	tx: Transaction,
	session: AuthSession,
	input: Body,
	totals: Totals,
): Promise<string> {
	const storeId = session.store.id;
	const { id } = insertedRow(
		await tx
			.insert(sales)
			.values({
				storeId,
				userId: session.user.id,
				number: await nextNumber(tx, sales, storeId),
				date: input.date,
				channel: input.channel,
				resellerId: input.resellerId,
				customerId: input.customerId,
				paymentCondition: input.paymentCondition,
				paymentMethod: input.paymentMethod,
				discount: input.discount,
				surcharge: input.surcharge,
				revenue: totals.revenue,
				productsCost: totals.productsCost,
				saleCosts: totals.saleCosts,
				profit: totals.profit,
			})
			.returning({ id: sales.id }),
	);
	return id;
}

/** A planned line with the id its row gets, made here so its ledger exit can point at it. */
type LineWithId = PlannedLine & { saleItemId: string };

async function insertLines(
	tx: Transaction,
	storeId: string,
	saleId: string,
	lines: LineWithId[],
): Promise<void> {
	await tx.insert(saleItems).values(
		lines.map((line, position) => ({
			id: line.saleItemId,
			storeId,
			saleId,
			productId: line.productId,
			position,
			quantity: line.quantity,
			unitPrice: line.unitPrice,
			unitCost: line.unitCost,
			cost: line.cost,
		})),
	);
}

async function insertCosts(
	tx: Transaction,
	storeId: string,
	saleId: string,
	costs: Totals["costs"],
): Promise<void> {
	if (costs.length === 0) return;
	await tx.insert(saleCosts).values(
		costs.map(({ kind, mode, value, label, amount }, position) => ({
			storeId,
			saleId,
			position,
			kind,
			mode,
			value,
			label: blankToNull(label),
			amount,
		})),
	);
}

/**
 * Sales (docs/product/vendas.md): what was sold, the costs and the real profit, which the server computes and keeps.
 * The units leave the stock through the ledger.
 */
export const SalesService = {
	/** The store's sales that match, newest first, with the totals of the active ones. */
	list(
		storeId: string,
		query: SalesModel["listQuery"],
	): Promise<SalesModel["page"]> {
		return listSales(storeId, query, storeToday());
	},

	get(storeId: string, id: string): Promise<SalesModel["detail"]> {
		return findSale(db, storeId, id);
	},

	/**
	 * Enters a sale: the sale, its lines and costs, and the exit of every unit, all or nothing. Each line costs the
	 * average cost of now, whatever its date (docs/decisions.md). Not enough sellable stock blocks it.
	 */
	create(session: AuthSession, input: Body): Promise<SalesModel["detail"]> {
		const storeId = session.store.id;
		const today = storeToday();
		assertSaleDate(input.date, today);
		assertChannel(input);
		assertUniqueProducts(input.items);
		return audited(session.user.id, async (tx) => {
			const ids = input.items.map((item) => item.productId);
			assertItems(input.items, await lockProducts(tx, storeId, ids));
			await assertParties(tx, storeId, input);
			const lines: LineWithId[] = planLines(
				input.items,
				await stockBalances(tx, storeId, ids),
				await sellableLots(tx, storeId, ids, today),
			).map((line) => ({ ...line, saleItemId: crypto.randomUUID() }));
			const totals = computeTotals({
				lines,
				discount: input.discount,
				surcharge: input.surcharge,
				costs: input.costs,
			});
			const saleId = await insertSale(tx, session, input, totals);
			await insertLines(tx, storeId, saleId, lines);
			await insertCosts(tx, storeId, saleId, totals.costs);
			await recordSaleExits(tx, { storeId, userId: session.user.id }, lines);
			return findSale(tx, storeId, saleId);
		});
	},
};
