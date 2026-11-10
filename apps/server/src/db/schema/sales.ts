import { sql } from "drizzle-orm";
import {
	check,
	date,
	index,
	integer,
	pgEnum,
	snakeCase,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { moneyColumn, moneyTotalColumn, timestamps } from "./helpers";
import { products } from "./products";
import { resellers } from "./resellers";
import { stockLots } from "./stock";
import { stores } from "./stores";
import { users } from "./users";

/** Where the sale happened (vendas.md). The app shows the same names (`SaleChannel` in mobile). */
export const saleChannel = pgEnum("sale_channel", [
	"store",
	"mercado_livre",
	"reseller",
]);

/** "À vista" or "A prazo": informative only, nothing is controlled from it (vendas.md). */
export const paymentCondition = pgEnum("payment_condition", ["cash", "term"]);

/** Informative only (vendas.md). */
export const paymentMethod = pgEnum("payment_method", [
	"pix",
	"cash",
	"credit",
	"debit",
]);

/** A cost of the sale (vendas.md, RF-VEN-07). */
export const saleCostKind = pgEnum("sale_cost_kind", [
	"freight",
	"tax",
	"platform_fee",
	"commission",
	"other",
]);

/** A cost typed in reais or as a percentage of the revenue. */
export const saleCostMode = pgEnum("sale_cost_mode", ["amount", "percent"]);

/**
 * Sales of a store (docs/product/vendas.md). Never edited: a wrong one is canceled and entered again. The
 * revenue, costs and real profit are computed by the server once, when it's entered, and kept: a later purchase or
 * cost correction never changes them.
 */
export const sales = snakeCase.table(
	"sales",
	{
		id: uuid().primaryKey().defaultRandom(),
		storeId: uuid()
			.notNull()
			.references(() => stores.id),
		/** "Venda #12": sequential in the store, never reused (a canceled one keeps its number). */
		number: integer().notNull(),
		/** The day the user says it happened; the reports use it. The costs are the ones of when it was entered. */
		date: date().notNull(),
		channel: saleChannel().notNull(),
		/** Required on the reseller channel, and only there. */
		resellerId: uuid().references(() => resellers.id),
		customerId: uuid().references(() => customers.id),
		paymentCondition: paymentCondition().notNull(),
		paymentMethod: paymentMethod().notNull(),
		/** On the whole sale, in cents. */
		discount: moneyColumn().notNull(),
		surcharge: moneyColumn().notNull(),
		/** Σ quantity × price − discount + surcharge, in cents; at most `MAX_CENTS`. */
		revenue: moneyColumn().notNull(),
		/** What left the stock with the products, in cents. */
		productsCost: moneyTotalColumn().notNull(),
		/** Σ of the amounts of the costs, in cents. */
		saleCosts: moneyTotalColumn().notNull(),
		/** Revenue − products cost − sale costs, in cents; negative is a loss. */
		profit: moneyTotalColumn().notNull(),
		/** Who entered it. */
		userId: uuid()
			.notNull()
			.references(() => users.id),
		/** Set by the cancellation, with its reason (vendas.md). */
		canceledAt: timestamp({ withTimezone: true }),
		cancelReason: text(),
		...timestamps,
	},
	(table) => [
		uniqueIndex("sales_store_number_key").on(table.storeId, table.number),
		index().on(table.storeId, table.date),
		index().on(table.resellerId),
		index().on(table.customerId),
		check(
			"sales_reseller_on_reseller_channel",
			sql`(${table.channel} = 'reseller') = (${table.resellerId} is not null)`,
		),
		check("sales_discount_non_negative", sql`${table.discount} >= 0`),
		check("sales_surcharge_non_negative", sql`${table.surcharge} >= 0`),
		check("sales_revenue_non_negative", sql`${table.revenue} >= 0`),
		check(
			"sales_profit_adds_up",
			sql`${table.profit} = ${table.revenue} - ${table.productsCost} - ${table.saleCosts}`,
		),
	],
);

/** One line of a sale. Its units leave the stock as one `sale` movement. */
export const saleItems = snakeCase.table(
	"sale_items",
	{
		id: uuid().primaryKey().defaultRandom(),
		storeId: uuid()
			.notNull()
			.references(() => stores.id),
		saleId: uuid()
			.notNull()
			.references(() => sales.id),
		productId: uuid()
			.notNull()
			.references(() => products.id),
		/** Order of the line in the sale, from 0. */
		position: integer().notNull(),
		quantity: integer().notNull(),
		/** In cents; zero is a gift that goes with the sale. */
		unitPrice: moneyColumn().notNull(),
		/** The average cost when the sale was entered, rounded to the cent. Never changes. */
		unitCost: moneyColumn().notNull(),
		/** What left the stock with these units, in cents (the whole value when the stock went to zero). */
		cost: moneyColumn().notNull(),
		...timestamps,
	},
	(table) => [
		uniqueIndex("sale_items_sale_position_key").on(
			table.saleId,
			table.position,
		),
		// One line per product: more units go in its quantity.
		uniqueIndex("sale_items_sale_product_key").on(
			table.saleId,
			table.productId,
		),
		index().on(table.productId),
		check("sale_items_quantity_positive", sql`${table.quantity} > 0`),
		check("sale_items_unit_price_non_negative", sql`${table.unitPrice} >= 0`),
		check("sale_items_unit_cost_non_negative", sql`${table.unitCost} >= 0`),
		check("sale_items_cost_non_negative", sql`${table.cost} >= 0`),
	],
);

/**
 * The lots a sale line took its units from, soonest expiry first. The cancellation gives them back to the
 * same lots (vendas.md, "Cancelamento").
 */
export const saleItemLots = snakeCase.table(
	"sale_item_lots",
	{
		id: uuid().primaryKey().defaultRandom(),
		storeId: uuid()
			.notNull()
			.references(() => stores.id),
		saleItemId: uuid()
			.notNull()
			.references(() => saleItems.id),
		lotId: uuid()
			.notNull()
			.references(() => stockLots.id),
		quantity: integer().notNull(),
		...timestamps,
	},
	(table) => [
		uniqueIndex("sale_item_lots_item_lot_key").on(
			table.saleItemId,
			table.lotId,
		),
		index().on(table.lotId),
		check("sale_item_lots_quantity_positive", sql`${table.quantity} > 0`),
	],
);

/** A cost of a sale, with the amount it came to (a percentage is of the revenue, rounded to the cent). */
export const saleCosts = snakeCase.table(
	"sale_costs",
	{
		id: uuid().primaryKey().defaultRandom(),
		storeId: uuid()
			.notNull()
			.references(() => stores.id),
		saleId: uuid()
			.notNull()
			.references(() => sales.id),
		/** Order of the cost in the sale, from 0. */
		position: integer().notNull(),
		kind: saleCostKind().notNull(),
		mode: saleCostMode().notNull(),
		/** Cents when `amount`, basis points when `percent` (0 to 10000). */
		value: integer().notNull(),
		/** What the person called it ("Embalagem"); null for the kind's own name. */
		label: text(),
		/** In cents: the value itself, or the percentage of the revenue. */
		amount: moneyColumn().notNull(),
		...timestamps,
	},
	(table) => [
		uniqueIndex("sale_costs_sale_position_key").on(
			table.saleId,
			table.position,
		),
		check(
			"sale_costs_value_range",
			sql`${table.value} >= 0 and (${table.mode} = 'amount' or ${table.value} <= 10000)`,
		),
		check("sale_costs_amount_non_negative", sql`${table.amount} >= 0`),
	],
);
