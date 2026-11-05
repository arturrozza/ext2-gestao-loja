import { index, snakeCase, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { percentColumn, percentRange, timestamps } from "./helpers";
import { stores } from "./stores";

/**
 * Resellers of a store (docs/product/revendedoras.md): a record, not a user. The name may repeat. Archived, never
 * deleted: they stay in the history and the reports.
 */
export const resellers = snakeCase.table(
	"resellers",
	{
		id: uuid().primaryKey().defaultRandom(),
		storeId: uuid()
			.notNull()
			.references(() => stores.id),
		name: text().notNull(),
		/** Digits only, with the area code (10 or 11); the app masks it. */
		phone: text(),
		/** Suggested on each sale on the reseller channel. Changing it never touches past sales. */
		defaultCommission: percentColumn().notNull(),
		note: text(),
		/** Name and phone lowercased and without accents (`normalizeSearch`): what the search matches. */
		searchText: text().notNull(),
		archivedAt: timestamp({ withTimezone: true }),
		...timestamps,
	},
	(table) => [
		index().on(table.storeId, table.name),
		percentRange("resellers_default_commission_range", table.defaultCommission),
	],
);
