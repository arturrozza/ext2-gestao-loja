import { sql } from "drizzle-orm";
import {
	bigint,
	check,
	date,
	index,
	integer,
	pgEnum,
	snakeCase,
	text,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { moneyColumn, timestamps } from "./helpers";
import { products } from "./products";
import { purchaseItems } from "./purchases";
import { saleItems } from "./sales";
import { stores } from "./stores";
import { users } from "./users";

/*
 * Stock (docs/product/estoque.md). Nothing here keeps a running balance: the quantity of a product is the sum of its
 * lots and its value is the sum of its movements (the ledger is the source of truth, like Odoo's valuation layers),
 * and the average cost is value ÷ quantity, worked out when needed (docs/architecture.md).
 */

/** Units of a product with the same origin and expiry. The user never sees lots, only quantity per expiry. */
export const stockLots = snakeCase.table(
	"stock_lots",
	{
		id: uuid().primaryKey().defaultRandom(),
		storeId: uuid()
			.notNull()
			.references(() => stores.id),
		productId: uuid()
			.notNull()
			.references(() => products.id),
		/** The purchase line that brought it in (one lot per line). */
		purchaseItemId: uuid().references(() => purchaseItems.id),
		/** First day of the expiry month; null when the product has no expiry. */
		expiry: date(),
		/** Units still in it: sales and adjustments take from it, a canceled sale gives back what it took. */
		quantity: integer().notNull(),
		...timestamps,
	},
	(table) => [
		index().on(table.productId),
		uniqueIndex("stock_lots_purchase_item_key").on(table.purchaseItemId),
		check("stock_lots_quantity_non_negative", sql`${table.quantity} >= 0`),
		check(
			"stock_lots_expiry_first_day",
			sql`extract(day from ${table.expiry}) = 1`,
		),
	],
);

/** What moved the stock. The app shows the same names (`MovementType` in mobile). */
export const stockMovementType = pgEnum("stock_movement_type", [
	"purchase",
	"purchase_canceled",
	"sale",
	"sale_canceled",
	"adjustment",
	"cost_correction",
]);

/** Why an adjustment changed the quantity (estoque.md, "Ajuste"). The app shows the same names (`AdjustmentReason`). */
export const stockAdjustmentReason = pgEnum("stock_adjustment_reason", [
	"count",
	"damage",
	"loss",
	"expired_discarded",
	"gift_internal_use",
	"other",
]);

/**
 * The stock ledger: one row per change of quantity or cost, never updated or deleted (a trigger refuses it). The sum
 * of `valueChange` is the value of the product's stock.
 */
export const stockMovements = snakeCase.table(
	"stock_movements",
	{
		id: uuid().primaryKey().defaultRandom(),
		/**
		 * The order of the ledger. Taken at insert time, under the product lock, so a product's movements follow the
		 * order they happened (`createdAt` is the start of the transaction: equal within one purchase, and earlier for
		 * a write that waited on a lock).
		 */
		seq: bigint({ mode: "number" }).generatedAlwaysAsIdentity().notNull(),
		storeId: uuid()
			.notNull()
			.references(() => stores.id),
		productId: uuid()
			.notNull()
			.references(() => products.id),
		type: stockMovementType().notNull(),
		/** Signed change in units (an entry is positive). */
		quantity: integer().notNull(),
		/** Signed change in the stock value, in cents. An entry adds quantity × unit cost, exactly. */
		valueChange: moneyColumn().notNull(),
		/** In cents: the unit cost of an entry, the average cost taken by an exit. */
		unitCost: moneyColumn().notNull(),
		/** Units in stock right after it. */
		stockAfter: integer().notNull(),
		/** Average cost right after it, rounded to the cent (only for showing: the balance never uses it). */
		averageCostAfter: moneyColumn().notNull(),
		lotId: uuid().references(() => stockLots.id),
		/** Why, on an adjustment (null on every other type). */
		reason: stockAdjustmentReason(),
		/** What the person wrote: the explanation of an adjustment or a cost correction. */
		note: text(),
		/** Origin, when it came from a purchase. */
		purchaseItemId: uuid().references(() => purchaseItems.id),
		/** Origin, when it came from a sale: the line whose units left (the lots they left are in `sale_item_lots`). */
		saleItemId: uuid().references(() => saleItems.id),
		userId: uuid()
			.notNull()
			.references(() => users.id),
		...timestamps,
	},
	(table) => [
		index().on(table.productId, table.seq),
		index().on(table.purchaseItemId),
		index().on(table.saleItemId),
		// Every adjustment says why, and only adjustments have a reason.
		check(
			"stock_movements_reason_on_adjustment",
			sql`(${table.type} = 'adjustment') = (${table.reason} is not null)`,
		),
		// A movement comes from one purchase line, one sale line, or neither.
		check(
			"stock_movements_one_origin",
			sql`num_nonnulls(${table.purchaseItemId}, ${table.saleItemId}) <= 1`,
		),
		check(
			"stock_movements_stock_after_non_negative",
			sql`${table.stockAfter} >= 0`,
		),
		check(
			"stock_movements_average_cost_after_non_negative",
			sql`${table.averageCostAfter} >= 0`,
		),
	],
);
