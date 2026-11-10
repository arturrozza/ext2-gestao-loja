import { index, snakeCase, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";
import { stores } from "./stores";

/**
 * Regular customers of a store (docs/product/clientes.md). The name may repeat. Archived, never deleted: they stay in
 * the sales history.
 */
export const customers = snakeCase.table(
	"customers",
	{
		id: uuid().primaryKey().defaultRandom(),
		storeId: uuid()
			.notNull()
			.references(() => stores.id),
		name: text().notNull(),
		/** Digits only, with the area code (10 or 11); the app masks it. */
		phone: text(),
		/** Free text, as the store writes it ("Rua das Flores, 120, ap 32 - Jardins"). Not part of the search. */
		address: text(),
		note: text(),
		/** Name and phone lowercased and without accents (`normalizeSearch`): what the search matches. */
		searchText: text().notNull(),
		archivedAt: timestamp({ withTimezone: true }),
		...timestamps,
	},
	(table) => [index().on(table.storeId, table.name)],
);
