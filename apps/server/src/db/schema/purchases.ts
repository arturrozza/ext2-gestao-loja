import { sql } from "drizzle-orm";
import {
	check,
	date,
	index,
	integer,
	snakeCase,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { moneyColumn, timestamps } from "./helpers";
import { products } from "./products";
import { stores } from "./stores";
import { users } from "./users";

/**
 * Purchases of a store (docs/product/compras.md): the goods that come in. Never edited; a wrong one is canceled
 * and entered again, and stays in the history. Stock and cost live in the stock ledger (`stock.ts`), which
 * every item feeds.
 */
export const purchases = snakeCase.table(
	"purchases",
	{
		id: uuid().primaryKey().defaultRandom(),
		storeId: uuid()
			.notNull()
			.references(() => stores.id),
		/** "Compra #12": sequential in the store, never reused (a canceled one keeps its number). */
		number: integer().notNull(),
		/** The day the user says it happened ("2026-11-09"). The cost follows the order purchases are entered in. */
		date: date().notNull(),
		note: text(),
		userId: uuid()
			.notNull()
			.references(() => users.id),
		/** Set by the cancellation, with its optional reason (compras.md). */
		canceledAt: timestamp({ withTimezone: true }),
		cancelReason: text(),
		...timestamps,
	},
	(table) => [
		// Also serves the history: the store's purchases by number.
		uniqueIndex("purchases_store_number_key").on(table.storeId, table.number),
	],
);

/** One line of a purchase. Each one becomes a stock lot and an entry in the ledger. */
export const purchaseItems = snakeCase.table(
	"purchase_items",
	{
		id: uuid().primaryKey().defaultRandom(),
		storeId: uuid()
			.notNull()
			.references(() => stores.id),
		purchaseId: uuid()
			.notNull()
			.references(() => purchases.id),
		productId: uuid()
			.notNull()
			.references(() => products.id),
		/** Order of the line in the purchase, from 0. */
		position: integer().notNull(),
		quantity: integer().notNull(),
		/** In cents; zero is allowed (a gift from the supplier). */
		unitCost: moneyColumn().notNull(),
		/** First day of the expiry month ("2027-03-01" = 03/2027); null when the product has no expiry. */
		expiry: date(),
		...timestamps,
	},
	(table) => [
		uniqueIndex("purchase_items_purchase_position_key").on(
			table.purchaseId,
			table.position,
		),
		index().on(table.productId),
		check("purchase_items_quantity_positive", sql`${table.quantity} > 0`),
		check("purchase_items_unit_cost_non_negative", sql`${table.unitCost} >= 0`),
		check(
			"purchase_items_expiry_first_day",
			sql`extract(day from ${table.expiry}) = 1`,
		),
	],
);
