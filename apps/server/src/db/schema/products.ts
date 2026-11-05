import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	snakeCase,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { moneyColumn, positiveMoney, timestamps } from "./helpers";
import { stores } from "./stores";

/**
 * Products of a store (docs/product/produtos.md). Stock and cost aren't here: they come from purchases (MUN-12).
 * Archived, never deleted: they stay in the history.
 */
export const products = snakeCase.table(
	"products",
	{
		id: uuid().primaryKey().defaultRandom(),
		storeId: uuid()
			.notNull()
			.references(() => stores.id),
		/** A category of the same store (checked by the service). */
		categoryId: uuid().references(() => categories.id),
		name: text().notNull(),
		/** Normal sale price in cents, suggested on the sale. Always above zero. */
		basePrice: moneyColumn().notNull(),
		barcode: text(),
		internalCode: text(),
		minStock: integer(),
		location: text(),
		hasExpiry: boolean().notNull().default(false),
		/** Name and codes lowercased and without accents (`normalizeSearch`): what the search matches. */
		searchText: text().notNull(),
		archivedAt: timestamp({ withTimezone: true }),
		...timestamps,
	},
	(table) => [
		// Unique in the store, archived products included. Nulls never clash.
		uniqueIndex("products_store_barcode_key").on(table.storeId, table.barcode),
		uniqueIndex("products_store_internal_code_key").on(
			table.storeId,
			sql`lower(${table.internalCode})`,
		),
		index().on(table.storeId, table.name),
		index().on(table.categoryId),
		positiveMoney("products_base_price_positive", table.basePrice),
	],
);
